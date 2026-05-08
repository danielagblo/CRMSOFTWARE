import { ReactNode } from "react";

type KpiCardProps = {
  icon: ReactNode;
  title: string;
  gradientClass: string;
  value: number | string;
};

export const KpiCard = ({
  icon,
  title,
  gradientClass,
  value,
}: KpiCardProps) => {
  return (
    <div className="bg-white overflow-hidden shadow-sm border border-gray-100 rounded-xl">
      <div className={`p-5 bg-gradient-to-r ${gradientClass}`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">{icon}</div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="text-lg font-medium text-gray-900">
                {value || 0}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};
