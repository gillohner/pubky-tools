"use client";

import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showSearchIcon?: boolean;
  containerClassName?: string;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, showSearchIcon = true, containerClassName, ...props }, ref) => {
    if (showSearchIcon) {
      return (
        <div className={cn("relative flex-1", containerClassName)}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={ref}
            className={cn("pl-10 h-input-h text-input", className)}
            {...props}
          />
        </div>
      );
    }

    return (
      <Input
        ref={ref}
        className={cn("h-input-h text-input", className)}
        {...props}
      />
    );
  },
);

SearchInput.displayName = "SearchInput";

export { SearchInput };
