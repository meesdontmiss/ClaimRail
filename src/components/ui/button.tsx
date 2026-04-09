import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group relative isolate inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium tracking-[0.01em] transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:translate-y-[1px] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
  {
    variants: {
      variant: {
        default:
          "glass-button text-primary-foreground [--glass-surface:rgba(13,30,22,0.74)] [--glass-surface-top:rgba(136,255,187,0.24)] [--glass-surface-bottom:rgba(30,89,58,0.22)] [--glass-edge:rgba(154,255,200,0.22)] [--glass-bloom:rgba(84,255,150,0.4)] [--glass-shadow:0_18px_44px_rgba(5,12,9,0.46)] [--glass-trace-a:rgba(98,255,170,0)] [--glass-trace-b:rgba(133,255,190,0.95)] [--glass-trace-c:rgba(110,244,255,1)] [--glass-trace-d:rgba(224,255,235,0.88)] hover:text-white",
        destructive:
          "glass-button text-destructive-foreground [--glass-surface:rgba(43,17,22,0.78)] [--glass-surface-top:rgba(255,150,165,0.22)] [--glass-surface-bottom:rgba(120,29,43,0.18)] [--glass-edge:rgba(255,166,177,0.2)] [--glass-bloom:rgba(255,104,133,0.36)] [--glass-shadow:0_18px_44px_rgba(26,9,13,0.5)] [--glass-trace-a:rgba(255,134,150,0)] [--glass-trace-b:rgba(255,156,170,0.95)] [--glass-trace-c:rgba(255,202,146,1)] [--glass-trace-d:rgba(255,231,236,0.9)] hover:text-white",
        outline:
          "glass-button text-foreground [--glass-surface:rgba(16,20,28,0.56)] [--glass-surface-top:rgba(255,255,255,0.12)] [--glass-surface-bottom:rgba(255,255,255,0.03)] [--glass-edge:rgba(255,255,255,0.12)] [--glass-bloom:rgba(255,255,255,0.2)] [--glass-shadow:0_16px_36px_rgba(7,10,16,0.3)] [--glass-trace-a:rgba(255,255,255,0)] [--glass-trace-b:rgba(255,255,255,0.94)] [--glass-trace-c:rgba(169,225,255,0.98)] [--glass-trace-d:rgba(255,255,255,0.88)]",
        secondary:
          "glass-button text-foreground [--glass-surface:rgba(17,22,30,0.66)] [--glass-surface-top:rgba(255,255,255,0.14)] [--glass-surface-bottom:rgba(96,116,145,0.08)] [--glass-edge:rgba(255,255,255,0.13)] [--glass-bloom:rgba(103,165,255,0.24)] [--glass-shadow:0_16px_36px_rgba(8,11,18,0.32)] [--glass-trace-a:rgba(124,180,255,0)] [--glass-trace-b:rgba(188,222,255,0.95)] [--glass-trace-c:rgba(111,170,255,1)] [--glass-trace-d:rgba(228,244,255,0.88)]",
        ghost:
          "glass-button text-muted-foreground shadow-none [--glass-surface:rgba(255,255,255,0.02)] [--glass-surface-top:rgba(255,255,255,0.08)] [--glass-surface-bottom:rgba(255,255,255,0.01)] [--glass-edge:rgba(255,255,255,0.07)] [--glass-bloom:rgba(255,255,255,0.14)] [--glass-shadow:0_10px_22px_rgba(5,7,11,0.12)] [--glass-trace-a:rgba(255,255,255,0)] [--glass-trace-b:rgba(255,255,255,0.9)] [--glass-trace-c:rgba(232,242,255,0.98)] [--glass-trace-d:rgba(255,255,255,0.78)] hover:text-foreground",
        link: "rounded-none p-0 text-primary underline-offset-4 shadow-none hover:underline",
        success:
          "glass-button text-white [--glass-surface:rgba(10,33,24,0.78)] [--glass-surface-top:rgba(148,255,194,0.24)] [--glass-surface-bottom:rgba(30,107,63,0.2)] [--glass-edge:rgba(171,255,208,0.22)] [--glass-bloom:rgba(84,255,155,0.38)] [--glass-shadow:0_18px_44px_rgba(5,12,10,0.44)] [--glass-trace-a:rgba(111,255,174,0)] [--glass-trace-b:rgba(151,255,204,0.96)] [--glass-trace-c:rgba(108,250,244,1)] [--glass-trace-d:rgba(235,255,241,0.9)] hover:text-white",
        warning:
          "glass-button text-white [--glass-surface:rgba(45,28,8,0.78)] [--glass-surface-top:rgba(255,214,138,0.24)] [--glass-surface-bottom:rgba(138,87,16,0.18)] [--glass-edge:rgba(255,223,167,0.22)] [--glass-bloom:rgba(255,191,82,0.34)] [--glass-shadow:0_18px_44px_rgba(24,14,4,0.48)] [--glass-trace-a:rgba(255,208,124,0)] [--glass-trace-b:rgba(255,226,159,0.95)] [--glass-trace-c:rgba(255,170,73,1)] [--glass-trace-d:rgba(255,243,212,0.9)] hover:text-white",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-[13px]",
        lg: "h-12 px-6 text-[15px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

type ButtonChildProps = {
  className?: string;
  children?: React.ReactNode;
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const traceId = React.useId();
    const showTrace = variant !== "link";
    const sharedClassName = cn(buttonVariants({ variant, size, className }));

    const renderContent = (content: React.ReactNode) => (
      <>
        {showTrace ? (
          <svg
            aria-hidden="true"
            className="button-trace"
            viewBox="0 0 100 40"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient
                id={traceId}
                x1="0%"
                y1="50%"
                x2="100%"
                y2="50%"
              >
                <stop offset="0%" style={{ stopColor: "var(--glass-trace-a)" }} />
                <stop offset="36%" style={{ stopColor: "var(--glass-trace-b)" }} />
                <stop offset="68%" style={{ stopColor: "var(--glass-trace-c)" }} />
                <stop offset="100%" style={{ stopColor: "var(--glass-trace-d)" }} />
              </linearGradient>
            </defs>
            <rect
              className="button-trace-base"
              x="1.25"
              y="1.25"
              width="97.5"
              height="37.5"
              rx="19"
              ry="19"
              pathLength="100"
            />
            <rect
              className="button-trace-active"
              x="1.25"
              y="1.25"
              width="97.5"
              height="37.5"
              rx="19"
              ry="19"
              pathLength="100"
              style={{ stroke: `url(#${traceId})` }}
            />
          </svg>
        ) : null}
        <span className="button-label">{content}</span>
      </>
    );

    if (asChild) {
      const child = React.Children.only(children);

      if (!React.isValidElement<ButtonChildProps>(child)) {
        return null;
      }

      const childProps = child.props;

      return React.cloneElement(
        child,
        {
          ...props,
          className: cn(sharedClassName, childProps.className),
        },
        renderContent(childProps.children)
      );
    }

    return (
      <button
        className={sharedClassName}
        ref={ref}
        {...props}
      >
        {renderContent(children)}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
