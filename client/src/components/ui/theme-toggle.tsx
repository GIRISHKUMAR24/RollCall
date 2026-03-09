import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const isDark = theme === "dark";
    const newTheme = isDark ? "light" : "dark";

    // Fallback for browsers that don't support View Transitions
    if (!document.startViewTransition) {
      setTheme(newTheme);
      return;
    }

    // Get the exact click coordinates to originate the ripple effect
    const x = event.clientX;
    const y = event.clientY;

    // Calculate the distance to the furthest corner
    const endRadius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y)
    );

    const transition = document.startViewTransition(() => {
      // Synchronously toggle the class here so the final snapshot exactly captures the DOM in its new state
      const root = document.documentElement;
      root.classList.remove(isDark ? "dark" : "light");
      root.classList.add(newTheme);

      // Update the React state context
      setTheme(newTheme);
    });

    transition.ready.then(() => {
      // Create a clip-path animation animating the "new" snapshot
      document.documentElement.animate(
        [
          { clipPath: `circle(0px at ${x}px ${y}px)` },
          { clipPath: `circle(${endRadius}px at ${x}px ${y}px)` },
        ],
        {
          duration: 500,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleToggle}
      className="relative overflow-hidden border-2 backdrop-blur-sm bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 transition-all duration-300"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
