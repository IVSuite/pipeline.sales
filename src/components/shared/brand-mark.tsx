import { cn } from "@/lib/utils";

const MARK_SIZE = { sm: "text-lg", md: "text-2xl", lg: "text-5xl" };

export function BrandMark({
  layout = "inline",
  size = "md",
  className,
}: {
  layout?: "inline" | "stacked";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div
      className={cn(
        layout === "inline" ? "flex items-center gap-2.5" : "flex flex-col items-center",
        className
      )}
    >
      <span className={cn("font-serif font-bold leading-none tracking-tight text-foreground", MARK_SIZE[size])}>
        IV
      </span>
      <span
        className={cn(
          "font-medium uppercase text-muted-foreground",
          layout === "inline"
            ? "border-l border-border pl-2.5 text-[10px] leading-tight tracking-[0.15em]"
            : "mt-3 text-[10px] tracking-[0.3em]"
        )}
      >
        Sales Pipeline
      </span>
      {layout === "stacked" && (
        <span className="mt-2 text-[9px] uppercase tracking-[0.18em] text-muted-foreground/80">
          4th Generation Craft, Powered by Industry 4.0
        </span>
      )}
    </div>
  );
}

export function BrandDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-3", className)}>
      <span className="h-px w-8 bg-border" />
      <span className="text-xs text-muted-foreground">✦</span>
      <span className="h-px w-8 bg-border" />
    </div>
  );
}
