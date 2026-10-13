import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";

/** Brand wordmark shared by the desktop hero, the start menu, and the taskbar. */
export function MarinaraWordmark({ className }: { className?: string }) {
  const { t } = useTranslation();
  const brandName = t("app.documentTitle");
  return (
    <span
      className={cn(
        "mari-logo-gradient-text mari-logo-gradient-text--active inline-flex items-baseline font-black tracking-[-0.035em]",
        className,
      )}
    >
      {brandName}
    </span>
  );
}
