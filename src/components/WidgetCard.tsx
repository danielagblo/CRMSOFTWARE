import { ReactNode } from "react";

type WidgetCardProps = {
  title: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
};

export const WidgetCard = ({
  title,
  right,
  children,
  className,
  headerClassName,
  bodyClassName,
}: WidgetCardProps) => {
  return (
    <div
      className={[
        "bg-white p-6 rounded-xl shadow-sm border border-gray-100",
        "flex flex-col min-w-0 overflow-hidden",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={["flex items-start justify-between gap-4", headerClassName]
          .filter(Boolean)
          .join(" ")}
      >
        <h2 className="text-lg font-medium text-gray-900">{title}</h2>
        {right ? <div className="flex-shrink-0">{right}</div> : null}
      </div>

      <div
        className={["mt-4 flex-1 min-h-0", bodyClassName]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </div>
    </div>
  );
};
