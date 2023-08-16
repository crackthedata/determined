import React from 'react';

import { LineChart } from 'components/kit/LineChart';
import { XAxisDomain } from 'components/kit/LineChart/XAxisFilter';
import Section from 'components/Section';
import { ChartProps } from 'pages/TrialDetails/Profiles/types';
import { MetricType } from 'pages/TrialDetails/Profiles/types';
import { useFetchProfilerMetrics } from 'pages/TrialDetails/Profiles/useFetchProfilerMetrics';
import {
  getScientificNotationTickValues,
  getUnitForMetricName,
} from 'pages/TrialDetails/Profiles/utils';
import handleError from 'utils/error';

export const TimingMetricChart: React.FC<ChartProps> = ({ trial }) => {
  const timingMetrics = useFetchProfilerMetrics(trial.id, trial.state, MetricType.Timing);

  const yLabel = getUnitForMetricName('seconds');

  return (
    <Section bodyBorder bodyNoPadding title="Timing Metrics">
      <LineChart
        experimentId={trial.id}
        handleError={handleError}
        series={timingMetrics.data}
        xAxis={XAxisDomain.Time}
        xLabel="Time"
        yLabel={yLabel}
        yTickValues={getScientificNotationTickValues}
      />
    </Section>
  );
};

export default TimingMetricChart;
