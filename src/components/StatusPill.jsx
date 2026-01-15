import { STATUS } from "../constants/status";
import { classNames } from "../utils/classNames";

export function StatusPill({ code }) {
  const meta = STATUS[code] || STATUS.UNSET;
  const Icon = meta.icon;
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        meta.cls
      )}
      title={meta.label}
    >
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}
