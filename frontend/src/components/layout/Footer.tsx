export function Footer() {
  return (
    <footer className="bg-black border-t border-violet-500/10 py-8">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <p className="text-gray-400 text-sm">
          © {new Date().getFullYear()} Trinetra AI. All rights reserved.
        </p>
        <div className="mt-2 flex justify-center gap-4 text-sm">
          <a href="/terms" className="text-gray-500 hover:text-white">Terms</a>
          <a href="/privacy" className="text-gray-500 hover:text-white">Privacy</a>
          <a href="/contact" className="text-gray-500 hover:text-white">Contact</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;