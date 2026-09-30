import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
import unittest
from voice_router import InboundCallGuard

class TestInboundRateLimitAndRecording(unittest.IsolatedAsyncioTestCase):
    async def test_caller_rate_limit_abuse(self):
        guard = InboundCallGuard()
        caller = "+15550001111"
        dest = "+15559990000"

        # First 5 calls should succeed
        for i in range(5):
            is_abusive, reason = await guard.check_abuse(caller, dest)
            self.assertFalse(is_abusive, f"Call {i+1} should not be flagged as abusive")

        # 6th call from same caller within 60s should be blocked
        is_abusive, reason = await guard.check_abuse(caller, dest)
        self.assertTrue(is_abusive, "6th rapid call from same caller should be flagged")
        self.assertEqual(reason, "caller_burst_abuse")

    async def test_destination_flood_limit_abuse(self):
        guard = InboundCallGuard()
        dest = "+15558883333"

        # 25 calls from distinct callers
        for i in range(25):
            caller = f"+1555000{i:04d}"
            is_abusive, reason = await guard.check_abuse(caller, dest)
            self.assertFalse(is_abusive)

        # 26th call to the same destination within 60s should trigger flood protection
        is_abusive, reason = await guard.check_abuse("+15559999999", dest)
        self.assertTrue(is_abusive)
        self.assertEqual(reason, "destination_flood_abuse")

if __name__ == "__main__":
    unittest.main()
