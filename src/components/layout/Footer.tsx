import { Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-4 py-3 px-4 sm:px-6 rounded-xl sm:rounded-2xl glass-strong glow-primary-sm animate-fade-in-up">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground text-center">
        <span>Designed and Developed by</span>
        <span className="font-semibold text-primary">SHAHEER AHMED</span>
        <span className="mx-2 hidden sm:inline">|</span>
        <a 
          href="mailto:chaudharyshaheer382@gmail.com" 
          className="flex items-center gap-1.5 hover:text-primary transition-colors duration-300 mt-1 sm:mt-0"
        >
          <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="text-xs sm:text-sm">chaudharyshaheer382@gmail.com</span>
        </a>
      </div>
    </footer>
  );
}
