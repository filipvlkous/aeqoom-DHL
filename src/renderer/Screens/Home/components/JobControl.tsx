import React from 'react';
import useTcpStore from '../../../useTcpStore';
import { useTranslation } from 'react-i18next';

type JobControlProps = {
  regimeCol: number[];
  handleRegimeChange: React.ChangeEventHandler<HTMLSelectElement>;
};

export default function JobControl({
  regimeCol,
  handleRegimeChange,
}: JobControlProps) {
  const store = useTcpStore();
  const { t } = useTranslation();

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
        <span>{t('home.jobControl.title')}</span>
      </div>
      <div className="relative">
        <select
          value={store.regime ?? ''}
          onChange={handleRegimeChange}
          className="w-full appearance-none bg-white border-2 border-gray-300 rounded-lg px-4 py-3 pr-10 text-sm font-medium text-gray-700 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 cursor-pointer shadow-sm"
        >
          <option value="" disabled>
            {t('home.jobControl.choose')}
          </option>
          <option value="all">{t('home.jobControl.minMax')}</option>
          {regimeCol.map((regime) => (
            <option key={regime} value={regime} className="font-medium">
              {regime} {t('home.jobControl.job')}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
