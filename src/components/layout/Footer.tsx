import { Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 py-3 px-4 glass-strong backdrop-blur-md border-t border-border/30">
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <span>Designed and Developed by</span>
        <span className="font-semibold text-primary">SHAHEER AHMED</span>
        <span className="mx-2">|</span>
        <a 
          href="mailto:chaudharyshaheer382@gmail.com" 
          className="flex items-center gap-1.5 hover:text-primary transition-colors"
        >
          <Mail className="h-4 w-4" />
          <span>chaudharyshaheer382@gmail.com</span>
        </a>
      </div>
    </footer>
  );
}
