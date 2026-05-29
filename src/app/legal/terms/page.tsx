export default function TermsPage() {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans p-6 md:p-12">
            <div className="max-w-3xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
                <p className="text-sm text-zinc-500">Last updated: February 6, 2024</p>

                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white">1. Agreement to Terms</h2>
                    <p>
                        By accessing our website at trinetra.ai, you agree to be bound by these terms of service, all applicable laws and regulations,
                        and agree that you are responsible for compliance with any applicable local laws. If you do not agree with any of these terms,
                        you are prohibited from using or accessing this site.
                    </p>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white">2. Use License</h2>
                    <p>
                        Permission is granted to temporarily download one copy of the materials (information or software) on Trinetra Systems' website for personal,
                        non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>modify or copy the materials;</li>
                        <li>use the materials for any commercial purpose, or for any public display (commercial or non-commercial);</li>
                        <li>attempt to decompile or reverse engineer any software contained on Trinetra Systems' website;</li>
                        <li>remove any copyright or other proprietary notations from the materials; or</li>
                        <li>transfer the materials to another person or "mirror" the materials on any other server.</li>
                    </ul>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white">3. Disclaimer</h2>
                    <p>
                        The materials on Trinetra Systems' website are provided on an 'as is' basis. Trinetra Systems makes no warranties, expressed or implied,
                        and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability,
                        fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                    </p>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white">4. Limitations</h2>
                    <p>
                        In no event shall Trinetra Systems or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit,
                        or due to business interruption) arising out of the use or inability to use the materials on Trinetra Systems' website, even if Trinetra Systems
                        or a Trinetra Systems authorized representative has been notified orally or in writing of the possibility of such damage.
                    </p>
                </div>
            </div>
        </div>
    );
}
