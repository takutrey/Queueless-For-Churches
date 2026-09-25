import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ComboboxSelectProps {
  label?: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const ComboboxSelect = ({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
}: ComboboxSelectProps) => {
  const selected = options.find((opt) => opt.value === value)?.label;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between"
        >
          {selected || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup>
            {options.map((item) => (
              <CommandItem
                key={item.value}
                onSelect={() => onChange(item.value)}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === item.value ? "opacity-100" : "opacity-0",
                  )}
                />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
