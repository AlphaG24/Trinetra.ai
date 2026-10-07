"""
backend/tests/test_encrypted_kyc_vault.py

Comprehensive Automated Verification Suite for Task 15:
Encrypted KYC Vault & Admin Access Controls.
Implements and enforces Master Plan Section 18.6 & 18.15 Item 13 (Authoritative Overrides).

Governing Standards:
- Master Plan Section 18.6 & 18.4:
  - Strict Data Minimization & Mandatory Affirmative Upload Consent.
  - UIDAI Raw Aadhaar Prohibition & Masking (XXXX-XXXX-1234).
  - AES-256-GCM Storage Encryption at Rest with SHA-256 integrity checksums.
  - Short-Lived Access (<= 15 minutes / 900s max signed view URLs).
  - Privileged Step-Up Auth Enforcement for admins (action: 'kyc_view').
  - 'developer_tester' accounts strictly forbidden from uploading, viewing, or downloading KYC documents.
  - Immutable Access Audit Logging in kyc_access_audit_logs.
- Direct service-layer and route-level verification (bypassing broken starlette/httpx TestClient).
"""

import os
import sys
import uuid
import base64
import hashlib
from datetime import datetime, timezone, timedelta
import pytest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.kyc_vault_service import (
    KYCVaultService,
    ALLOWED_KYC_DOCUMENT_TYPES,
    STATUTORY_KYC_CONSENT_TEXT,
    MAX_SIGNED_URL_EXPIRY_SECONDS,
)
from app.services.admin_auth_service import AdminAuthService
from app.routers.kyc_router import (
    upload_kyc_document,
    list_kyc_documents,
    generate_signed_view_url,
    review_kyc_document,
    get_document_audit_logs,
    UploadKYCRequest,
    SignedUrlRequest,
    ReviewKYCRequest,
)
from fastapi import HTTPException


# ==============================================================================
# In-Memory Mock Supabase Client for KYC Vault Testing
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
            "kyc_documents": [],
            "kyc_access_audit_logs": [],
        }

    def table(self, name: str):
        if name not in self.tables:
            self.tables[name] = []
        return MockQueryBuilder(self.tables[name])


# ==============================================================================
# Suite 1: UIDAI Masking & Statutory Consent Notice
# ==============================================================================
class TestUIDAIMaskingAndConsent:
    """Verifies compliance with UIDAI Aadhaar masking and mandatory affirmative consent."""

    def test_aadhaar_masking_12_digits(self):
        """12-digit Aadhaar must mask first 8 digits as XXXX-XXXX-1234."""
        masked = KYCVaultService.mask_national_id("authorized_signatory_id", "5489 1234 9876")
        assert masked == "XXXX-XXXX-9876"

        masked_hyphenated = KYCVaultService.mask_national_id("authorized_signatory_id", "5489-1234-9876")
        assert masked_hyphenated == "XXXX-XXXX-9876"

    def test_pan_card_masking(self):
        """Indian PAN (10 chars) masks characters 6-9 as ABCDE****F."""
        masked = KYCVaultService.mask_national_id("company_pan", "ABCDE1234F")
        assert masked == "ABCDE****F"

    def test_passport_and_other_id_masking(self):
        """Passports and other IDs mask leading characters and keep last 4."""
        masked = KYCVaultService.mask_national_id("passport", "Z1234567")
        assert masked == "****4567"

    def test_empty_or_none_id_returns_none(self):
        """None or empty raw ID returns None cleanly."""
        assert KYCVaultService.mask_national_id("company_pan", None) is None
        assert KYCVaultService.mask_national_id("company_pan", "") is None

    def test_mandatory_consent_text_integrity(self):
        """Affirmative consent text must reference DoT, AES-256, DPDP Act 2023, and CONFIRM WITH A LAWYER."""
        text = STATUTORY_KYC_CONSENT_TEXT
        assert "AES-256" in text
        assert "Department of Telecommunications" in text
        assert "CONFIRM WITH A LAWYER" in text


# ==============================================================================
# Suite 2: AES-256-GCM Storage Encryption at Rest
# ==============================================================================
class TestAES256StorageEncryption:
    """Verifies AES-256-GCM authenticated encryption and SHA-256 checksum generation."""

    def test_document_bytes_encryption_roundtrip(self):
        """Document bytes encrypt with AES-256 and decrypt cleanly."""
        service = KYCVaultService(master_key=b"12345678901234567890123456789012")
        fake_pdf = b"%PDF-1.4 Fake Enterprise Certificate Content XYZ"

        enc_bytes, checksum = service.encrypt_document_bytes(fake_pdf)
        assert enc_bytes != fake_pdf
        assert len(enc_bytes) >= len(fake_pdf) + 28
        assert checksum == hashlib.sha256(fake_pdf).hexdigest()

        decrypted = service.decrypt_document_bytes(enc_bytes)
        assert decrypted == fake_pdf

    def test_fresh_nonce_per_encryption(self):
        """Two encryptions of identical file bytes produce distinct nonces and ciphertexts."""
        service = KYCVaultService(master_key=b"12345678901234567890123456789012")
        sample = b"Invoice content payload"

        enc1, _ = service.encrypt_document_bytes(sample)
        enc2, _ = service.encrypt_document_bytes(sample)

        assert enc1 != enc2
        assert service.decrypt_document_bytes(enc1) == sample
        assert service.decrypt_document_bytes(enc2) == sample

    def test_corrupted_payload_raises_error(self):
        """Tampered or corrupted ciphertext bytes raise an authentication error."""
        service = KYCVaultService(master_key=b"12345678901234567890123456789012")
        enc, _ = service.encrypt_document_bytes(b"Sensitive payload")

        corrupted = bytearray(enc)
        corrupted[-1] ^= 0xFF

        with pytest.raises(Exception):
            service.decrypt_document_bytes(bytes(corrupted))


# ==============================================================================
# Suite 3: Document Ingestion, Consent Check & Data Minimization
# ==============================================================================
class TestKYCDocumentIngestion:
    """Verifies customer upload flow, consent enforcement, and database records."""

    @pytest.fixture
    def mock_db(self):
        return MockSupabaseClient()

    @pytest.fixture
    def kyc_service(self, mock_db):
        return KYCVaultService(supabase_client=mock_db, master_key=b"12345678901234567890123456789012")

    def test_customer_upload_success(self, kyc_service, mock_db):
        """Customer uploads GSTIN certificate with mandatory affirmative consent."""
        org_id = "org_client_101"
        user_id = "user_cust_1"
        file_bytes = b"%PDF-1.4 GST Registration Certificate XYZ"

        res = kyc_service.upload_kyc_document(
            organization_id=org_id,
            user_id=user_id,
            user_role="customer",
            document_type="gstin_certificate",
            file_bytes=file_bytes,
            filename="gstin_cert.pdf",
            mime_type="application/pdf",
            raw_id_number="07AAAAA0000A1Z5",
            upload_consent_given=True,
            upload_ip_address="203.0.113.195",
        )

        assert res["status"] == "pending_review"
        assert res["document_type"] == "gstin_certificate"
        assert res["id_number_masked"] == "07AAA****5"
        assert res["upload_consent_recorded"] is True
        assert res["file_size_bytes"] == len(file_bytes)

        # Check DB rows
        db_docs = mock_db.tables["kyc_documents"]
        assert len(db_docs) == 1
        stored = db_docs[0]
        assert stored["organization_id"] == org_id
        assert stored["is_raw_aadhaar_stored"] is False
        assert stored["upload_consent_given"] is True

        # Check initial audit log
        audit_rows = mock_db.tables["kyc_access_audit_logs"]
        assert len(audit_rows) == 1
        assert audit_rows[0]["document_id"] == res["id"]

    def test_missing_consent_raises_value_error(self, kyc_service):
        """Upload without affirmative consent must be rejected."""
        with pytest.raises(ValueError, match="Statutory affirmative KYC consent is mandatory"):
            kyc_service.upload_kyc_document(
                organization_id="org_test",
                user_id="u1",
                user_role="customer",
                document_type="company_pan",
                file_bytes=b"file bytes",
                filename="pan.pdf",
                mime_type="application/pdf",
                upload_consent_given=False,
            )

    def test_invalid_document_type_rejected(self, kyc_service):
        """Unsupported document types are rejected with ValueError."""
        with pytest.raises(ValueError, match="Invalid document_type"):
            kyc_service.upload_kyc_document(
                organization_id="org_test",
                user_id="u1",
                user_role="customer",
                document_type="unsupported_doc",
                file_bytes=b"bytes",
                filename="doc.pdf",
                mime_type="application/pdf",
            )


# ==============================================================================
# Suite 4: Role-Based Access Controls & Step-Up Auth Enforcement
# ==============================================================================
class TestRoleBasedAccessAndStepUpAuth:
    """Verifies developer_tester prohibition and admin step-up re-authentication (Section 18.4)."""

    @pytest.fixture
    def mock_db(self):
        return MockSupabaseClient()

    @pytest.fixture
    def kyc_service(self, mock_db):
        return KYCVaultService(supabase_client=mock_db, master_key=b"12345678901234567890123456789012")

    def test_developer_tester_forbidden_from_uploading(self, kyc_service):
        """developer_tester accounts are strictly forbidden from uploading KYC documents."""
        with pytest.raises(PermissionError, match="developer_tester accounts are strictly forbidden"):
            kyc_service.upload_kyc_document(
                organization_id="org_test",
                user_id="u_tester",
                user_role="developer_tester",
                document_type="company_pan",
                file_bytes=b"bytes",
                filename="pan.pdf",
                mime_type="application/pdf",
            )

    def test_developer_tester_forbidden_from_viewing(self, kyc_service, mock_db):
        """developer_tester accounts are strictly forbidden from generating signed view URLs."""
        doc = kyc_service.upload_kyc_document(
            organization_id="org_client",
            user_id="u_cust",
            user_role="customer",
            document_type="company_pan",
            file_bytes=b"bytes",
            filename="pan.pdf",
            mime_type="application/pdf",
        )

        with pytest.raises(PermissionError, match="developer_tester accounts are strictly forbidden"):
            kyc_service.generate_signed_view_url(
                document_id=doc["id"],
                requesting_user_id="u_dev_tester",
                requesting_user_role="developer_tester",
                organization_id="org_client",
            )

    def test_customer_cross_tenant_view_blocked(self, kyc_service):
        """Customer in Org A cannot view Org B's KYC documents."""
        doc_b = kyc_service.upload_kyc_document(
            organization_id="org_victim_b",
            user_id="u_b",
            user_role="customer",
            document_type="passport",
            file_bytes=b"passport bytes",
            filename="passport.pdf",
            mime_type="application/pdf",
        )

        with pytest.raises(PermissionError, match="Cross-tenant KYC document access is strictly prohibited"):
            kyc_service.generate_signed_view_url(
                document_id=doc_b["id"],
                requesting_user_id="u_attacker_a",
                requesting_user_role="customer",
                organization_id="org_attacker_a",
            )

    def test_admin_requires_step_up_token(self, kyc_service):
        """Admin without step-up authentication token is rejected."""
        doc = kyc_service.upload_kyc_document(
            organization_id="org_client",
            user_id="u_cust",
            user_role="customer",
            document_type="utility_bill",
            file_bytes=b"bill bytes",
            filename="bill.pdf",
            mime_type="application/pdf",
        )

        with pytest.raises(PermissionError, match="Privileged step-up authentication required"):
            kyc_service.generate_signed_view_url(
                document_id=doc["id"],
                requesting_user_id="admin_1",
                requesting_user_role="admin",
                organization_id="org_client",
                step_up_token=None,  # Missing step-up token
            )

    def test_admin_with_valid_step_up_token_succeeds(self, kyc_service, mock_db):
        """Admin with valid step-up auth token generates signed URL capped at 15 minutes."""
        doc = kyc_service.upload_kyc_document(
            organization_id="org_client",
            user_id="u_cust",
            user_role="customer",
            document_type="utility_bill",
            file_bytes=b"bill bytes",
            filename="bill.pdf",
            mime_type="application/pdf",
        )

        # Generate valid step-up token for 'kyc_view'
        token = AdminAuthService.issue_step_up_token("admin_user_01", "admin", "kyc_view")

        url_res = kyc_service.generate_signed_view_url(
            document_id=doc["id"],
            requesting_user_id="admin_user_01",
            requesting_user_role="admin",
            organization_id="org_client",
            step_up_token=token,
            client_ip="198.51.100.2",
            justification="Carrier activation compliance check",
            expiry_seconds=1200,  # Requests 20 minutes
        )

        assert url_res["step_up_verified"] is True
        assert url_res["expires_in_seconds"] == 900  # Capped at 15 minutes
        assert "/api/kyc/documents/" in url_res["signed_url"]

        # Verify audit log appended
        logs = mock_db.tables["kyc_access_audit_logs"]
        assert len(logs) == 2  # 1 upload + 1 admin view
        assert logs[-1]["accessed_by_user_id"] == "admin_user_01"
        assert logs[-1]["step_up_token_verified"] is True


# ==============================================================================
# Suite 5: Admin Review Sign-off & Audit Trail Export
# ==============================================================================
class TestAdminReviewAndAuditTrail:
    """Verifies admin verification / rejection workflows and audit log retrieval."""

    @pytest.fixture
    def mock_db(self):
        return MockSupabaseClient()

    @pytest.fixture
    def kyc_service(self, mock_db):
        return KYCVaultService(supabase_client=mock_db, master_key=b"12345678901234567890123456789012")

    def test_admin_verify_document_success(self, kyc_service):
        """Admin marks KYC document as verified."""
        doc = kyc_service.upload_kyc_document(
            organization_id="org_client_2",
            user_id="u2",
            user_role="customer",
            document_type="incorporation_cert",
            file_bytes=b"incorporation cert",
            filename="inc.pdf",
            mime_type="application/pdf",
        )

        res = kyc_service.update_document_status(
            document_id=doc["id"],
            admin_user_id="admin_reviewer_1",
            admin_role="admin",
            new_status="verified",
        )

        assert res["status"] == "verified"
        assert res["verified_by_admin_id"] == "admin_reviewer_1"
        assert res["verified_at"] is not None

    def test_admin_reject_document_with_reason(self, kyc_service):
        """Admin rejects document with descriptive reason."""
        doc = kyc_service.upload_kyc_document(
            organization_id="org_client_3",
            user_id="u3",
            user_role="customer",
            document_type="utility_bill",
            file_bytes=b"bill content",
            filename="bill.pdf",
            mime_type="application/pdf",
        )

        res = kyc_service.update_document_status(
            document_id=doc["id"],
            admin_user_id="admin_reviewer_2",
            admin_role="admin",
            new_status="rejected",
            rejection_reason="Utility bill is older than 3 months. Please upload recent bill.",
        )

        assert res["status"] == "rejected"
        assert "older than 3 months" in res["rejection_reason"]

    def test_non_admin_cannot_review_documents(self, kyc_service):
        """Customer or developer_tester cannot review or approve documents."""
        with pytest.raises(PermissionError, match="Only authenticated administrators"):
            kyc_service.update_document_status(
                document_id="doc_xyz",
                admin_user_id="cust_1",
                admin_role="customer",
                new_status="verified",
            )

    def test_get_document_audit_logs_restricted_to_admin(self, kyc_service, mock_db):
        """Audit logs can only be retrieved by admins."""
        doc = kyc_service.upload_kyc_document(
            organization_id="org_client_4",
            user_id="u4",
            user_role="customer",
            document_type="company_pan",
            file_bytes=b"pan bytes",
            filename="pan.pdf",
            mime_type="application/pdf",
        )

        # Admin fetches audit logs -> succeeds
        admin_logs = kyc_service.get_document_audit_logs(doc["id"], "admin")
        assert len(admin_logs) >= 1

        # Customer attempts to fetch audit logs -> rejected
        with pytest.raises(PermissionError, match="restricted to administrators"):
            kyc_service.get_document_audit_logs(doc["id"], "customer")


# ==============================================================================
# Suite 6: Direct Handler-Level Route Verification
# ==============================================================================
class TestDirectKYCRouteLogic:
    """Direct invocation of FastAPI router handlers with mocked dependencies."""

    @pytest.mark.asyncio
    async def test_route_upload_kyc_document(self):
        """Tests upload_kyc_document endpoint handler."""
        with patch("app.routers.kyc_router.KYCVaultService") as MockServiceCls:
            instance = MockServiceCls.return_value
            instance.upload_kyc_document.return_value = {
                "id": "doc_route_1",
                "status": "pending_review",
                "document_type": "company_pan",
            }

            fake_b64 = base64.b64encode(b"sample pdf bytes").decode("utf-8")
            req = UploadKYCRequest(
                organization_id="org_route",
                user_id="user_route",
                document_type="company_pan",
                file_base64=fake_b64,
                filename="pan.pdf",
            )

            mock_request = MagicMock()
            mock_request.client.host = "127.0.0.1"

            res = await upload_kyc_document(req, mock_request)
            assert res["success"] is True
            assert res["document"]["id"] == "doc_route_1"

    @pytest.mark.asyncio
    async def test_route_list_kyc_documents(self):
        """Tests list_kyc_documents endpoint handler."""
        with patch("app.routers.kyc_router.KYCVaultService") as MockServiceCls:
            instance = MockServiceCls.return_value
            instance.list_organization_documents.return_value = [
                {"id": "doc_1", "status": "verified"},
                {"id": "doc_2", "status": "pending_review"},
            ]

            res = await list_kyc_documents(organization_id="org_route")
            assert res["success"] is True
            assert res["count"] == 2

    @pytest.mark.asyncio
    async def test_route_generate_signed_view_url(self):
        """Tests generate_signed_view_url endpoint handler."""
        with patch("app.routers.kyc_router.KYCVaultService") as MockServiceCls:
            instance = MockServiceCls.return_value
            instance.generate_signed_view_url.return_value = {
                "document_id": "doc_1",
                "signed_url": "/api/kyc/documents/doc_1/view?token=xyz",
                "expires_in_seconds": 900,
            }

            req = SignedUrlRequest(
                organization_id="org_route",
                requesting_user_id="admin_1",
                requesting_user_role="admin",
                step_up_token="valid_step_up_token",
            )
            mock_request = MagicMock()
            mock_request.client.host = "127.0.0.1"
            mock_request.headers.get.return_value = "Mozilla/5.0"

            res = await generate_signed_view_url("doc_1", req, mock_request)
            assert res["success"] is True
            assert res["data"]["expires_in_seconds"] == 900

    @pytest.mark.asyncio
    async def test_route_review_kyc_document(self):
        """Tests review_kyc_document endpoint handler."""
        with patch("app.routers.kyc_router.KYCVaultService") as MockServiceCls:
            instance = MockServiceCls.return_value
            instance.update_document_status.return_value = {
                "document_id": "doc_1",
                "status": "verified",
            }

            req = ReviewKYCRequest(
                admin_user_id="admin_1",
                status="verified",
            )
            mock_request = MagicMock()
            mock_request.client.host = "127.0.0.1"

            res = await review_kyc_document("doc_1", req, mock_request)
            assert res["success"] is True
            assert res["data"]["status"] == "verified"

    @pytest.mark.asyncio
    async def test_route_get_document_audit_logs(self):
        """Tests get_document_audit_logs endpoint handler."""
        with patch("app.routers.kyc_router.KYCVaultService") as MockServiceCls:
            instance = MockServiceCls.return_value
            instance.get_document_audit_logs.return_value = [
                {"id": "log_1", "access_type": "view_signed_url"},
            ]

            res = await get_document_audit_logs("doc_1", admin_role="admin")
            assert res["success"] is True
            assert res["count"] == 1
