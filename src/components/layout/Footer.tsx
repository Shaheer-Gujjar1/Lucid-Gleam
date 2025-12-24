import { Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="fixed bottom-4 left-4 right-4 z-50 py-3 px-6 rounded-2xl glass-strong glow-primary-sm animate-fade-in-up">
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground flex-wrap">
        <span>Designed and Developed by</span>
        <span className="font-semibold text-primary">SHAHEER AHMED</span>
        <span className="mx-2 hidden sm:inline">|</span>
        <a 
          href="mailto:chaudharyshaheer382@gmail.com" 
          className="flex items-center gap-1.5 hover:text-primary transition-colors duration-300"
        >
          <Mail className="h-4 w-4" />
          <span className="hidden sm:inline">chaudharyshaheer382@gmail.com</span>
        </a>
      </div>
    </footer>
  );
}
