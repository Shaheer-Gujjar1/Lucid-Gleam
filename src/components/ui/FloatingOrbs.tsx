import { cn } from "@/lib/utils";

interface FloatingOrbsProps {
  className?: string;
}

export function FloatingOrbs({ className }: FloatingOrbsProps) {
  return (
    <div className={cn("fixed inset-0 overflow-hidden pointer-events-none -z-10", className)}>
      {/* Primary gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-chart-2/5 animate-gradient" />
      
      {/* Floating orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-gradient-to-br from-primary/20 to-chart-2/20 rounded-full blur-3xl animate-float opacity-60" />
      <div className="absolute top-1/2 -right-32 w-[500px] h-[500px] bg-gradient-to-br from-chart-3/15 to-primary/15 rounded-full blur-3xl animate-float-delayed opacity-50" />
      <div className="absolute -bottom-20 left-1/3 w-80 h-80 bg-gradient-to-br from-chart-2/20 to-chart-4/20 rounded-full blur-3xl animate-float-slow opacity-40" />
      <div className="absolute top-10 right-1/4 w-64 h-64 bg-gradient-to-br from-primary/10 to-chart-1/10 rounded-full blur-2xl animate-pulse-glow opacity-50" />
      
      {/* Subtle grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />
    </div>
  );
}