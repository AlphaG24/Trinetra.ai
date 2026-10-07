"""
backend/tests/test_byon_credential_vault.py

Comprehensive Automated Verification Suite for Task 13:
Bring-Your-Own Numbers (BYON - Twilio & Exotel) Encrypted Credential Vault.
Implements and enforces Master Plan Section 18.8 (Authoritative Overrides).

Governing Standards:
- Master Plan Section 18.8:
  - AES-256-GCM authenticated encryption for third-party carrier credentials.
  - Plaintext tokens never stored in database columns or exposed in API/logs.
  - Zero plaintext secrets in responses (masked as e.g. 'AC39...XXXX...a9b1').
  - Carrier number syncing into telephony inventory.
  - Agent assignment with strict multi-tenant boundary checks.
  - Revocation handling with graceful number suspension.
  - DLT compliance exemption (customer's own telecom account).
  - Twilio webhook signature verification (HMAC-SHA1 per Twilio spec).
- Direct service-layer verification (bypassing broken starlette/httpx TestClient).
"""

import os
import sys
import uuid
import base64
import hmac
import hashlib
from datetime import datetime, timezone
import pytest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.byon_vault_service import (
    BYONVaultService,
    SUPPORTED_CARRIERS,
)
from app.routers.byon_router import (
    store_carrier_credential,
    list_carrier_credentials,
    sync_carrier_numbers,
    assign_byon_number,
    revoke_carrier_credential,
    StoreCredentialRequest,
    SyncNumbersRequest,
    AssignAgentRequest,
    RevokeCredentialRequest,
)
from fastapi import HTTPException


# ==============================================================================
# In-Memory Mock Supabase Client for Multi-Tenant BYON Testing
# ==============================================================================
class MockQueryBuilder:
    def __init__(self, table_data):
        self.table_data = table_data
        self.filters = []
        self._action = "select"
        self._update_payload = None
        self._insert_payload = None
        self._limit_n = None

    def select(self, *args, **kwargs):
        self._action = "select"
        return self

    def eq(self, col, val):
        self.filters.append((col, val))
        return self

    def limit(self, n):
        self._limit_n = n
        return self

    def insert(self, payload):
        self._action = "insert"
        self._insert_payload = payload
        return self

    def update(self, payload):
        self._action = "update"
        self._update_payload = payload
        return self

    def execute(self):
        if self._action == "insert":
            if isinstance(self._insert_payload, list):
                for r in self._insert_payload:
                    r.setdefault("id", str(uuid.uuid4()))
                self.table_data.extend(self._insert_payload)
                return MagicMock(data=self._insert_payload)
            else:
                self._insert_payload.setdefault("id", str(uuid.uuid4()))
                self.table_data.append(self._insert_payload)
                return MagicMock(data=[self._insert_payload])

        elif self._action == "update":
            matching = []
            for row in self.table_data:
                match = all(row.get(col) == val for col, val in self.filters)
                if match:
                    row.update(self._update_payload)
                    matching.append(dict(row))
            return MagicMock(data=matching)

        else:  # select
            results = []
            for row in self.table_data:
                match = all(row.get(col) == val for col, val in self.filters)
                if match:
                    results.append(dict(row))

            if self._limit_n:
                results = results[:self._limit_n]

            return MagicMock(data=results)


class MockSupabaseClient:
    def __init__(self):
        self.tables = {
            "byon_carrier_credentials": [],
            "byon_phone_numbers": [],
            "agents": [],
        }

    def table(self, name: str):
        if name not in self.tables:
            self.tables[name] = []
        return MockQueryBuilder(self.tables[name])


# ==============================================================================
# Suite 1: Cryptographic Primitives (AES-256-GCM Authenticated Encryption)
# ==============================================================================
class TestAES256GCMEncryption:
    """Verifies AES-256-GCM encryption, decryption, nonce generation, and error conditions."""

    def test_encryption_and_decryption_roundtrip(self):
        """Plaintext secrets must encrypt and decrypt perfectly with identical contents."""
        service = BYONVaultService(master_key=b"12345678901234567890123456789012")
        secret = "secret_twilio_auth_token_999888777_xyz"

        encrypted = service.encrypt_secret(secret)
        assert isinstance(encrypted, str)
        assert encrypted != secret
        # Base64 string must decode to at least 28 bytes (12 nonce + len + 16 tag)
        raw = base64.b64decode(encrypted.encode("utf-8"))
        assert len(raw) >= 28

        decrypted = service.decrypt_secret(encrypted)
        assert decrypted == secret

    def test_nonce_uniqueness_on_identical_plaintexts(self):
        """Two encryptions of the identical plaintext must generate distinct nonces and distinct ciphertexts."""
        service = BYONVaultService(master_key=b"12345678901234567890123456789012")
        secret = "static_exotel_token_12345"

        enc1 = service.encrypt_secret(secret)
        enc2 = service.encrypt_secret(secret)

        assert enc1 != enc2, "Fresh cryptographically random nonces must produce different ciphertexts"
        # Both must still decrypt to the original secret
        assert service.decrypt_secret(enc1) == secret
        assert service.decrypt_secret(enc2) == secret

    def test_tampered_ciphertext_raises_error(self):
        """AES-256-GCM authentication must reject tampered or corrupted ciphertexts."""
        service = BYONVaultService(master_key=b"12345678901234567890123456789012")
        secret = "critical_carrier_auth_key"

        encrypted = service.encrypt_secret(secret)
        raw = bytearray(base64.b64decode(encrypted.encode("utf-8")))

        # Flip a bit in the ciphertext / tag region
        raw[-1] ^= 0x01
        tampered = base64.b64encode(bytes(raw)).decode("utf-8")

        with pytest.raises(Exception):  # cryptography.exceptions.InvalidTag
            service.decrypt_secret(tampered)

    def test_corrupted_or_truncated_payload_raises_value_error(self):
        """Payload shorter than nonce + tag minimum (28 bytes) must raise ValueError."""
        service = BYONVaultService(master_key=b"12345678901234567890123456789012")
        short_payload = base64.b64encode(b"short").decode("utf-8")

        with pytest.raises(ValueError, match="Corrupted encrypted ciphertext"):
            service.decrypt_secret(short_payload)

    def test_empty_secret_raises_value_error(self):
        """Empty plaintext or missing encrypted payload raises ValueError."""
        service = BYONVaultService(master_key=b"12345678901234567890123456789012")

        with pytest.raises(ValueError, match="Cannot encrypt empty"):
            service.encrypt_secret("")

        with pytest.raises(ValueError, match="missing"):
            service.decrypt_secret("")

    def test_secret_masking(self):
        """Sensitive tokens must be masked showing only 4-char prefix and 4-char suffix."""
        token = "9f8e7d6c5b4a3210abcdef9876543210"
        masked = BYONVaultService.mask_secret(token)
        assert masked == "9f8e...XXXX...3210"
        assert token not in masked

        # Short strings
        assert BYONVaultService.mask_secret("short") == "********"
        assert BYONVaultService.mask_secret("") == "********"

    def test_fingerprint_deterministic_and_unique(self):
        """Key fingerprint must be deterministic for identical secret and distinct across secrets."""
        fp1 = BYONVaultService.compute_fingerprint("token_a")
        fp2 = BYONVaultService.compute_fingerprint("token_a")
        fp3 = BYONVaultService.compute_fingerprint("token_b")

        assert fp1 == fp2
        assert fp1 != fp3
        assert len(fp1) == 64  # SHA-256 hex string

    def test_custom_master_key_validation(self):
        """Master key must be exactly 32 bytes."""
        with pytest.raises(ValueError, match="exactly 32 bytes"):
            BYONVaultService._resolve_encryption_key(b"too_short")


# ==============================================================================
# Suite 2: BYONVaultService Operations & Multi-Tenant Isolation
# ==============================================================================
class TestBYONVaultService:
    """Verifies enterprise credential vaulting, syncing, agent assignment, and tenant boundaries."""

    @pytest.fixture
    def mock_db(self):
        return MockSupabaseClient()

    @pytest.fixture
    def vault_service(self, mock_db):
        return BYONVaultService(
            supabase_client=mock_db,
            master_key=b"enterprise_test_32_bytes_vault_k",
        )

    def test_store_carrier_credential_twilio(self, vault_service, mock_db):
        """Stores Twilio credentials with AES-256-GCM encryption and zero plaintext exposure."""
        org_id = "org_enterprise_100"
        res = vault_service.store_carrier_credential(
            organization_id=org_id,
            carrier="twilio",
            account_sid="ACTEST_SYNTHETIC_00000000000000000000",
            auth_token="auth_tok_secret_998877665544332211",
            webhook_url="https://api.trinetra.ai/webhooks/voice/twilio",
        )

        assert res["carrier"] == "twilio"
        assert res["organization_id"] == org_id
        assert res["status"] == "active"
        assert "auth_tok_secret" not in str(res)
        assert res["masked_token"] == "auth...XXXX...2211"
        assert len(res["key_fingerprint"]) == 64

        # Check DB row: encrypted_auth_token is encrypted, NOT plaintext
        db_rows = mock_db.tables["byon_carrier_credentials"]
        assert len(db_rows) == 1
        stored = db_rows[0]
        assert stored["carrier"] == "twilio"
        assert stored["account_sid"] == "ACTEST_SYNTHETIC_00000000000000000000"
        assert "auth_tok_secret" not in stored["encrypted_auth_token"]
        assert stored["status"] == "active"

    def test_store_carrier_credential_exotel(self, vault_service, mock_db):
        """Stores Exotel credentials with API key SID and auth token."""
        org_id = "org_enterprise_200"
        res = vault_service.store_carrier_credential(
            organization_id=org_id,
            carrier="exotel",
            account_sid="exotel_sid_corp_ind_88",
            auth_token="exotel_token_secret_abcdef123456",
            api_key_or_sid="exotel_api_key_sid_555",
        )

        assert res["carrier"] == "exotel"
        assert res["api_key_or_sid"] == "exotel_api_key_sid_555"
        assert res["masked_token"] == "exot...XXXX...3456"

    def test_store_carrier_credential_invalid_carrier(self, vault_service):
        """Unsupported carriers must be rejected with ValueError."""
        with pytest.raises(ValueError, match="Unsupported carrier"):
            vault_service.store_carrier_credential(
                organization_id="org_test",
                carrier="unsupported_telecom",
                account_sid="SID12345",
                auth_token="TOK12345678",
            )

    def test_store_carrier_credential_upsert_updates_existing(self, vault_service, mock_db):
        """Re-saving credentials for the same org + carrier + account_sid updates the existing record."""
        org_id = "org_rotator"
        res1 = vault_service.store_carrier_credential(
            organization_id=org_id,
            carrier="twilio",
            account_sid="AC_ROTATING_SID",
            auth_token="initial_token_11111111",
        )
        assert len(mock_db.tables["byon_carrier_credentials"]) == 1

        # Rotate key
        res2 = vault_service.store_carrier_credential(
            organization_id=org_id,
            carrier="twilio",
            account_sid="AC_ROTATING_SID",
            auth_token="rotated_token_22222222",
        )
        assert len(mock_db.tables["byon_carrier_credentials"]) == 1
        assert res1["id"] == res2["id"]
        assert res2["masked_token"] == "rota...XXXX...2222"

    def test_cross_tenant_isolation_get_decrypted_credential(self, vault_service):
        """Org A cannot decrypt or access Org B's credentials under any condition."""
        cred_b = vault_service.store_carrier_credential(
            organization_id="org_victim_b",
            carrier="twilio",
            account_sid="AC_VICTIM_ORG_B",
            auth_token="victim_secret_token_org_b",
        )

        # Attacker org_a attempts to decrypt org_victim_b's credential
        with pytest.raises(PermissionError, match="tenant boundary violation"):
            vault_service.get_decrypted_credential(
                credential_id=cred_b["id"],
                organization_id="org_attacker_a",
            )

        # Org B itself can decrypt legitimately
        decrypted = vault_service.get_decrypted_credential(
            credential_id=cred_b["id"],
            organization_id="org_victim_b",
        )
        assert decrypted["auth_token"] == "victim_secret_token_org_b"
        assert decrypted["account_sid"] == "AC_VICTIM_ORG_B"

    def test_carrier_number_sync(self, vault_service, mock_db):
        """Syncs carrier numbers into byon_phone_numbers inventory while preserving DLT configuration."""
        org_id = "org_dlt_client"
        cred = vault_service.store_carrier_credential(
            organization_id=org_id,
            carrier="exotel",
            account_sid="exotel_dlt_account",
            auth_token="exotel_dlt_secret_9988",
        )

        mock_numbers = [
            {
                "phone_number": "+918012345678",
                "carrier_sid": "EXO_NUM_001",
                "friendly_name": "Bangalore Support Primary",
                "dlt_entity_id": "110155223344",  # Customer's own DLT Entity ID
                "dlt_template_id": "120266334455",
            },
            {
                "phone_number": "+918087654321",
                "carrier_sid": "EXO_NUM_002",
                "friendly_name": "Bangalore Sales Inbound",
                "dlt_entity_id": "110155223344",
                "dlt_template_id": None,
            },
        ]

        sync_res = vault_service.sync_carrier_numbers(
            credential_id=cred["id"],
            organization_id=org_id,
            mock_carrier_numbers=mock_numbers,
        )

        assert sync_res["synced_count"] == 2
        assert len(mock_db.tables["byon_phone_numbers"]) == 2

        # Verify DLT compliance data stored on number
        n1 = next(n for n in mock_db.tables["byon_phone_numbers"] if n["phone_number"] == "+918012345678")
        assert n1["dlt_entity_id"] == "110155223344"
        assert n1["dlt_template_id"] == "120266334455"
        assert n1["carrier"] == "exotel"
        assert n1["status"] == "active"

    def test_assign_number_to_agent_success(self, vault_service, mock_db):
        """Assigns an owned BYON number to an agent belonging to the same organization."""
        org_id = "org_agent_assign"
        # Seed an agent
        agent_id = "agent_sarah_01"
        mock_db.tables["agents"].append({
            "id": agent_id,
            "organization_id": org_id,
            "name": "Sarah AI Agent",
        })

        # Seed BYON number
        num_id = "num_byon_101"
        mock_db.tables["byon_phone_numbers"].append({
            "id": num_id,
            "organization_id": org_id,
            "phone_number": "+14155550199",
            "status": "unassigned",
            "assigned_agent_id": None,
        })

        res = vault_service.assign_number_to_agent(
            byon_number_id=num_id,
            organization_id=org_id,
            agent_id=agent_id,
        )

        assert res["assigned_agent_id"] == agent_id
        assert res["status"] == "active"

        # Unassign number
        res_un = vault_service.assign_number_to_agent(
            byon_number_id=num_id,
            organization_id=org_id,
            agent_id=None,
        )
        assert res_un["assigned_agent_id"] is None
        assert res_un["status"] == "unassigned"

    def test_assign_number_cross_tenant_blocked(self, vault_service, mock_db):
        """Attempting to assign Org A's number to Org B's agent is strictly blocked."""
        # Org A's number
        num_id = "num_org_a"
        mock_db.tables["byon_phone_numbers"].append({
            "id": num_id,
            "organization_id": "org_a",
            "phone_number": "+14155551111",
        })

        # Org B's agent
        mock_db.tables["agents"].append({
            "id": "agent_org_b",
            "organization_id": "org_b",
            "name": "Foreign Agent",
        })

        # Org A tries to assign to Org B's agent -> PermissionError
        with pytest.raises(PermissionError, match="belonging to another organization"):
            vault_service.assign_number_to_agent(
                byon_number_id=num_id,
                organization_id="org_a",
                agent_id="agent_org_b",
            )

        # Org B tries to assign Org A's number -> PermissionError
        with pytest.raises(PermissionError, match="tenant mismatch"):
            vault_service.assign_number_to_agent(
                byon_number_id=num_id,
                organization_id="org_b",
                agent_id="agent_org_b",
            )

    def test_revoke_credential_suspends_numbers(self, vault_service, mock_db):
        """Revoking credentials transitions status to 'revoked' and suspends associated BYON numbers."""
        org_id = "org_revoke_test"
        cred = vault_service.store_carrier_credential(
            organization_id=org_id,
            carrier="twilio",
            account_sid="AC_REVOKE_TARGET",
            auth_token="auth_to_be_revoked_1234",
        )

        # Seed two numbers for this credential
        mock_db.tables["byon_phone_numbers"].extend([
            {"id": "num_1", "credential_id": cred["id"], "organization_id": org_id, "status": "active"},
            {"id": "num_2", "credential_id": cred["id"], "organization_id": org_id, "status": "active"},
        ])

        revoke_res = vault_service.revoke_credential(
            credential_id=cred["id"],
            organization_id=org_id,
            reason="Carrier API credentials invalidated by admin",
        )

        assert revoke_res["status"] == "revoked"
        assert revoke_res["reason"] == "Carrier API credentials invalidated by admin"

        # Numbers must be suspended
        for n in mock_db.tables["byon_phone_numbers"]:
            assert n["status"] == "suspended"

        # Attempting to retrieve decrypted secret of revoked cred raises ValueError
        with pytest.raises(ValueError, match="has been revoked"):
            vault_service.get_decrypted_credential(cred["id"], org_id)


# ==============================================================================
# Suite 3: Twilio Webhook Signature Verification (HMAC-SHA1 Spec)
# ==============================================================================
class TestTwilioWebhookSignature:
    """Verifies standard Twilio webhook HMAC-SHA1 signature verification algorithm."""

    def test_valid_twilio_signature(self):
        """Verifies signature matches when generated with identical auth token, URL, and POST params."""
        auth_token = "1234567890abcdef1234567890abcdef"
        url = "https://api.trinetra.ai/webhooks/voice/twilio"
        params = {
            "CallSid": "CA1234567890",
            "From": "+14155550100",
            "To": "+14155550200",
            "CallStatus": "ringing",
        }

        # Compute valid signature per spec
        s = url
        for k in sorted(params.keys()):
            s += f"{k}{params[k]}"
        expected_sig = base64.b64encode(
            hmac.new(auth_token.encode("utf-8"), s.encode("utf-8"), hashlib.sha1).digest()
        ).decode("utf-8")

        is_valid = BYONVaultService.verify_twilio_webhook_signature(
            auth_token=auth_token,
            url=url,
            params=params,
            expected_signature=expected_sig,
        )
        assert is_valid is True

    def test_tampered_signature_rejected(self):
        """Tampered or invalid signature returns False."""
        auth_token = "1234567890abcdef1234567890abcdef"
        url = "https://api.trinetra.ai/webhooks/voice/twilio"
        params = {"CallSid": "CA1234567890"}

        is_valid = BYONVaultService.verify_twilio_webhook_signature(
            auth_token=auth_token,
            url=url,
            params=params,
            expected_signature="bogus_signature_xyz==",
        )
        assert is_valid is False

    def test_tampered_params_rejected(self):
        """Signature generated for different payload parameters returns False."""
        auth_token = "1234567890abcdef1234567890abcdef"
        url = "https://api.trinetra.ai/webhooks/voice/twilio"
        params = {"CallSid": "CA1234567890"}

        # Sign with different params
        expected_sig = base64.b64encode(
            hmac.new(auth_token.encode("utf-8"), f"{url}CallSidCA99999".encode("utf-8"), hashlib.sha1).digest()
        ).decode("utf-8")

        is_valid = BYONVaultService.verify_twilio_webhook_signature(
            auth_token=auth_token,
            url=url,
            params=params,
            expected_signature=expected_sig,
        )
        assert is_valid is False

    def test_empty_signature_or_token_returns_false_cleanly(self):
        """Missing parameters return False without throwing uncaught exceptions."""
        assert BYONVaultService.verify_twilio_webhook_signature("", "https://url.com", {}, "sig") is False
        assert BYONVaultService.verify_twilio_webhook_signature("token", "", {}, "sig") is False
        assert BYONVaultService.verify_twilio_webhook_signature("token", "https://url.com", {}, "") is False


# ==============================================================================
# Suite 4: Direct Handler-Level Route Verification
# ==============================================================================
class TestDirectBYONRouteLogic:
    """Direct invocation of FastAPI router handlers with mocked dependencies."""

    @pytest.fixture
    def mock_db(self):
        return MockSupabaseClient()

    @pytest.mark.asyncio
    async def test_route_store_carrier_credential(self, mock_db):
        """Tests store_carrier_credential endpoint handler."""
        with patch("app.routers.byon_router.BYONVaultService") as MockServiceCls:
            instance = MockServiceCls.return_value
            instance.store_carrier_credential.return_value = {
                "id": "cred_route_1",
                "carrier": "twilio",
                "organization_id": "org_route",
                "masked_token": "AC39...XXXX...1234",
                "status": "active",
            }

            req = StoreCredentialRequest(
                organization_id="org_route",
                carrier="twilio",
                account_sid="AC391234567890123456789012345678",
                auth_token="secret_auth_token_9999",
            )
            res = await store_carrier_credential(req)

            assert res["success"] is True
            assert "AES-256-GCM" in res["message"]
            assert res["credential"]["id"] == "cred_route_1"

    @pytest.mark.asyncio
    async def test_route_store_carrier_credential_bad_carrier_raises_400(self):
        """Invalid carrier raises HTTP 400."""
        with patch("app.routers.byon_router.BYONVaultService") as MockServiceCls:
            instance = MockServiceCls.return_value
            instance.store_carrier_credential.side_effect = ValueError("Unsupported carrier")

            req = StoreCredentialRequest(
                organization_id="org_route",
                carrier="bogus_carrier",
                account_sid="SID12345",
                auth_token="TOK12345678",
            )
            with pytest.raises(HTTPException) as exc_info:
                await store_carrier_credential(req)
            assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_route_list_carrier_credentials(self):
        """Tests list_carrier_credentials endpoint handler."""
        with patch("app.routers.byon_router.BYONVaultService") as MockServiceCls:
            instance = MockServiceCls.return_value
            instance.list_carrier_credentials.return_value = [
                {"id": "c1", "carrier": "twilio", "status": "active"},
                {"id": "c2", "carrier": "exotel", "status": "active"},
            ]

            res = await list_carrier_credentials(organization_id="org_test")
            assert res["success"] is True
            assert res["count"] == 2
            assert len(res["credentials"]) == 2

    @pytest.mark.asyncio
    async def test_route_sync_carrier_numbers(self):
        """Tests sync_carrier_numbers endpoint handler."""
        with patch("app.routers.byon_router.BYONVaultService") as MockServiceCls:
            instance = MockServiceCls.return_value
            instance.sync_carrier_numbers.return_value = {
                "credential_id": "cred_sync_1",
                "synced_count": 3,
                "numbers": [{"phone_number": "+918011112222"}],
            }

            req = SyncNumbersRequest(organization_id="org_sync")
            res = await sync_carrier_numbers("cred_sync_1", req)

            assert res["success"] is True
            assert "Successfully synchronized 3 numbers" in res["message"]
            assert res["data"]["synced_count"] == 3

    @pytest.mark.asyncio
    async def test_route_sync_carrier_numbers_forbidden_cross_tenant_raises_403(self):
        """Syncing another organization's credential raises HTTP 403."""
        with patch("app.routers.byon_router.BYONVaultService") as MockServiceCls:
            instance = MockServiceCls.return_value
            instance.sync_carrier_numbers.side_effect = PermissionError("tenant boundary violation")

            req = SyncNumbersRequest(organization_id="org_attacker")
            with pytest.raises(HTTPException) as exc_info:
                await sync_carrier_numbers("cred_victim", req)
            assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_route_assign_byon_number(self):
        """Tests assign_byon_number endpoint handler."""
        with patch("app.routers.byon_router.BYONVaultService") as MockServiceCls:
            instance = MockServiceCls.return_value
            instance.assign_number_to_agent.return_value = {
                "id": "num_assign_1",
                "assigned_agent_id": "agent_123",
                "status": "active",
            }

            req = AssignAgentRequest(organization_id="org_assign", agent_id="agent_123")
            res = await assign_byon_number("num_assign_1", req)

            assert res["success"] is True
            assert res["data"]["assigned_agent_id"] == "agent_123"

    @pytest.mark.asyncio
    async def test_route_revoke_carrier_credential(self):
        """Tests revoke_carrier_credential endpoint handler."""
        with patch("app.routers.byon_router.BYONVaultService") as MockServiceCls:
            instance = MockServiceCls.return_value
            instance.revoke_credential.return_value = {
                "credential_id": "cred_to_revoke",
                "status": "revoked",
                "reason": "Admin revoked",
            }

            req = RevokeCredentialRequest(
                organization_id="org_revoke",
                reason="Admin revoked",
            )
            res = await revoke_carrier_credential("cred_to_revoke", req)

            assert res["success"] is True
            assert res["data"]["status"] == "revoked"
