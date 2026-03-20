export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans p-6 md:p-12">
            <div className="max-w-3xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
                <p className="text-sm text-zinc-500">Last updated: February 6, 2024</p>

                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white">1. Introduction</h2>
                    <p>
                        Trinetra Systems ("we", "our", or "us") respects your privacy and is committed to protecting your personal data.
                        This privacy policy will inform you as to how we look after your personal data when you visit our website
                        (regardless of where you visit it from) and tell you about your privacy rights and how the law protects you.
                    </p>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white">2. Data We Collect</h2>
                    <p>
                        We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Identity Data includes first name, last name, username or similar identifier.</li>
                        <li>Contact Data includes billing address, delivery address, email address and telephone numbers.</li>
                        <li>Technical Data includes internet protocol (IP) address, login data, browser type and version.</li>
                        <li>Usage Data includes information about how you use our website, products and services.</li>
                    </ul>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white">3. How We Use Your Data</h2>
                    <p>
                        We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
                        <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
                        <li>Where we need to comply with a legal or regulatory obligation.</li>
                    </ul>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white">4. Data Security</h2>
                    <p>
                        We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed.
                    </p>
                </div>
            </div>
        </div>
    );
}
