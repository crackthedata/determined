import { CellClickedEventArgs, GridCellKind } from '@glideapps/glide-data-grid';
import { getColor, getInitials } from 'hew/Avatar';
import { ColumnDefs, MIN_COLUMN_WIDTH } from 'hew/DataGrid/columns';
import {
  LINK_CELL,
  State,
  STATE_CELL,
  TAGS_CELL,
  TEXT_CELL,
  USER_AVATAR_CELL,
} from 'hew/DataGrid/custom-renderers/index';
import { Theme } from 'hew/Theme';
import { Loadable } from 'hew/utils/loadable';

import { handlePath, paths } from 'routes/utils';
import { DetailedUser, FlatRun, RunState } from 'types';
import { DURATION_UNIT_MEASURES, durationInEnglish, getTimeInEnglish } from 'utils/datetime';
import { humanReadableNumber } from 'utils/number';
import { AnyMouseEvent } from 'utils/routes';
import { capitalize, floatToPercent, humanReadableBytes } from 'utils/string';
import { getDisplayName } from 'utils/user';

// order used in ColumnPickerMenu
export const runColumns = [
  'id',
  'state',
  'startTime',
  'user',
  'searcherType',
  'searcherMetric',
  'searcherMetricsVal',
  'tags',
  'forkedFrom',
  'duration',
  'experimentProgress',
  'experimentId',
  'experimentName',
  'experimentDescription',
  'resourcePool',
  'checkpointCount',
  'checkpointSize',
  'externalExperimentId',
  'externalRunId',
  'isExpMultitrial',
  'parentArchived',
] as const;

export type RunColumn = (typeof runColumns)[number];

export const defaultRunColumns: RunColumn[] = [...runColumns];

function getCellStateFromExperimentState(expState: RunState) {
  switch (expState) {
    case RunState.Queued: {
      return State.QUEUED;
    }
    case RunState.Starting:
    case RunState.Pulling: {
      return State.STARTING;
    }
    case RunState.Running: {
      return State.RUNNING;
    }
    case RunState.Paused: {
      return State.PAUSED;
    }
    case RunState.Completed: {
      return State.SUCCESS;
    }
    case RunState.Error:
    case RunState.Deleted:
    case RunState.Deleting:
    case RunState.DeleteFailed: {
      return State.ERROR;
    }
    case RunState.Active:
    case RunState.Unspecified: {
      return State.ACTIVE;
    }
    default: {
      return State.STOPPED;
    }
  }
}

interface Params {
  appTheme: Theme;
  columnWidths: Record<string, number>;
  themeIsDark: boolean;
  users: Loadable<DetailedUser[]>;
}
export const getColumnDefs = ({
  columnWidths,
  themeIsDark,
  users,
  appTheme,
}: Params): ColumnDefs<FlatRun> => ({
  archived: {
    id: 'parentArchived',
    renderer: (record: FlatRun) => ({
      allowOverlay: false,
      data: String(record.parentArchived),
      displayData: record.parentArchived ? '📦' : '',
      kind: GridCellKind.Text,
    }),
    title: 'Archived',
    tooltip: () => undefined,
    width: columnWidths.parentArchived ?? defaultColumnWidths.parentArchived ?? MIN_COLUMN_WIDTH,
  },
  checkpointCount: {
    id: 'checkpointCount',
    isNumerical: true,
    renderer: (record: FlatRun) => ({
      allowOverlay: false,
      data: Number(record.checkpointCount),
      displayData: String(record.checkpointCount),
      kind: GridCellKind.Number,
    }),
    title: 'Checkpoints',
    tooltip: () => undefined,
    width: columnWidths.checkpointCount ?? defaultColumnWidths.checkpointCount ?? MIN_COLUMN_WIDTH,
  },
  checkpointSize: {
    id: 'checkpointSize',
    isNumerical: true,
    renderer: (record: FlatRun) => ({
      allowOverlay: false,
      copyData: record.checkpointSize ? humanReadableBytes(record.checkpointSize) : '',
      data: { kind: TEXT_CELL },
      kind: GridCellKind.Custom,
    }),
    title: 'Checkpoint Size',
    tooltip: () => undefined,
    width: columnWidths.checkpointSize ?? defaultColumnWidths.checkpointSize ?? MIN_COLUMN_WIDTH,
  },
  duration: {
    id: 'duration',
    isNumerical: true,
    renderer: (record: FlatRun) => ({
      allowOverlay: false,
      copyData: record.duration
        ? durationInEnglish(
            (record.endTime ? new Date(record.endTime) : new Date()).getTime() -
              new Date(record.startTime).getTime(),
            {
              conjunction: ' ',
              delimiter: ' ',
              largest: 2,
              serialComma: false,
              unitMeasures: { ...DURATION_UNIT_MEASURES, ms: 1000 },
            },
          )
        : '',
      data: { kind: TEXT_CELL },
      kind: GridCellKind.Custom,
    }),
    title: 'Duration',
    tooltip: () => undefined,
    width: columnWidths.duration ?? defaultColumnWidths.duration ?? MIN_COLUMN_WIDTH,
  },
  experimentDescription: {
    id: 'experimentDescription',
    renderer: (record: FlatRun) => ({
      allowOverlay: false,
      copyData: String(record.experiment?.description),
      data: { kind: TEXT_CELL },
      kind: GridCellKind.Custom,
    }),
    title: 'Searcher Description',
    tooltip: () => undefined,
    width:
      columnWidths.experimentDescription ??
      defaultColumnWidths.experimentDescription ??
      MIN_COLUMN_WIDTH,
  },
  experimentId: {
    id: 'experimentId',
    renderer: (record: FlatRun) => ({
      allowOverlay: false,
      copyData: String(record.id),
      cursor: 'pointer',
      data: {
        kind: LINK_CELL,
        link: record.experiment?.id
          ? {
              href: paths.experimentDetails(record.experiment.id),
              title: String(record.experiment.id),
              unmanaged: record.experiment.unmanaged,
            }
          : undefined,
        navigateOn: 'click',
        onClick: (e: CellClickedEventArgs) => {
          if (record.experiment) {
            handlePath(e as unknown as AnyMouseEvent, {
              path: paths.experimentDetails(record.experiment.id),
            });
          }
        },
        underlineOffset: 6,
      },
      kind: GridCellKind.Custom,
      readonly: true,
    }),
    title: 'Searcher ID',
    tooltip: () => undefined,
    width: columnWidths.experimentId ?? defaultColumnWidths.experimentId ?? MIN_COLUMN_WIDTH,
  },
  experimentName: {
    id: 'experimentName',
    renderer: (record: FlatRun) => ({
      allowOverlay: false,
      copyData: String(record.experiment?.name),
      cursor: 'pointer',
      data: {
        kind: LINK_CELL,
        link: record.experiment?.id
          ? {
              href: paths.experimentDetails(record.experiment?.id),
              title: String(record.experiment?.name),
              unmanaged: record.experiment.unmanaged,
            }
          : undefined,
        navigateOn: 'click',
        onClick: (e: CellClickedEventArgs) => {
          if (record.experiment) {
            handlePath(e as unknown as AnyMouseEvent, {
              path: paths.experimentDetails(record.experiment.id),
            });
          }
        },
        underlineOffset: 6,
      },
      kind: GridCellKind.Custom,
      readonly: true,
    }),
    title: 'Searcher Name',
    tooltip: () => undefined,
    width: columnWidths.experimentName ?? defaultColumnWidths.experimentName ?? MIN_COLUMN_WIDTH,
  },
  externalExperimentId: {
    id: 'externalExperimentId',
    renderer: (record: FlatRun) => ({
      allowOverlay: false,
      copyData: record.experiment?.externalExperimentId ?? '',
      data: { kind: TEXT_CELL },
      kind: GridCellKind.Custom,
    }),
    title: 'External Experiment ID',
    tooltip: () => undefined,
    width:
      columnWidths.externalExperimentId ??
      defaultColumnWidths.externalExperimentId ??
      MIN_COLUMN_WIDTH,
  },
  externalRunId: {
    id: 'externalRunId',
    renderer: (record: FlatRun) => ({
      allowOverlay: false,
      copyData: String(record.externalRunId ?? ''),
      data: { kind: TEXT_CELL },
      kind: GridCellKind.Custom,
    }),
    title: 'External Run ID',
    tooltip: () => undefined,
    width: columnWidths.externalRunId ?? defaultColumnWidths.externalRunId ?? MIN_COLUMN_WIDTH,
  },
  forkedFrom: {
    id: 'forkedFrom',
    renderer: (record: FlatRun) => ({
      allowOverlay: false,
      copyData: String(record.experiment?.forkedFrom ?? ''),
      cursor: record.experiment?.forkedFrom ? 'pointer' : undefined,
      data: {
        kind: LINK_CELL,
        link:
          record.experiment?.forkedFrom !== undefined
            ? {
                href: record.experiment?.forkedFrom
                  ? paths.experimentDetails(record.experiment?.forkedFrom)
                  : undefined,
                title: String(record.experiment?.forkedFrom ?? ''),
              }
            : undefined,
        navigateOn: 'click',
        onClick: (e: CellClickedEventArgs) => {
          if (record.experiment?.forkedFrom) {
            handlePath(e as unknown as AnyMouseEvent, {
              path: String(record.experiment.forkedFrom),
            });
          }
        },
        underlineOffset: 6,
      },
      kind: GridCellKind.Custom,
      readonly: true,
    }),
    title: 'Forked From',
    tooltip: () => undefined,
    width: columnWidths.forkedFrom ?? defaultColumnWidths.forkedFrom ?? MIN_COLUMN_WIDTH,
  },
  id: {
    id: 'id',
    renderer: (record: FlatRun) => ({
      allowOverlay: false,
      copyData: String(record.id),
      cursor: 'pointer',
      data: {
        kind: LINK_CELL,
        link: record.experiment?.id
          ? {
              href: paths.trialDetails(record.id, record.experiment.id),
              title: String(record.id),
              unmanaged: record.experiment.unmanaged,
            }
          : undefined,
        navigateOn: 'click',
        onClick: (e: CellClickedEventArgs) => {
          if (record.experiment) {
            handlePath(e as unknown as AnyMouseEvent, {
              path: paths.trialDetails(record.id, record.experiment.id),
            });
          }
        },
        underlineOffset: 6,
      },
      kind: GridCellKind.Custom,

      readonly: true,
    }),
    title: 'ID',
    tooltip: () => undefined,
    width: columnWidths.id ?? defaultColumnWidths.id ?? MIN_COLUMN_WIDTH,
  },
  isExpMultitrial: {
    id: 'isExpMultitrial',
    renderer: (record: FlatRun) => ({
      allowOverlay: false,
      data: String(record.experiment?.isMultitrial),
      displayData: record.experiment?.isMultitrial ? '✔️' : '',
      kind: GridCellKind.Text,
    }),
    title: 'Searcher Multitrial',
    tooltip: () => undefined,
    width: columnWidths.isExpMultitrial ?? defaultColumnWidths.isExpMultitrial ?? MIN_COLUMN_WIDTH,
  },
  progress: {
    id: 'experimentProgress',
    renderer: (record: FlatRun) => {
      const percentage = floatToPercent(record.experiment?.progress ?? 0, 0);

      return {
        allowOverlay: false,
        data: percentage,
        displayData: percentage,
        kind: GridCellKind.Text,
      };
    },
    title: 'Searcher Progress',
    tooltip: () => undefined,
    width:
      columnWidths.experimentProgress ?? defaultColumnWidths.experimentProgress ?? MIN_COLUMN_WIDTH,
  },
  resourcePool: {
    id: 'resourcePool',
    renderer: (record: FlatRun) => ({
      allowOverlay: false,
      copyData: String(record.experiment?.resourcePool),
      data: { kind: TEXT_CELL },
      kind: GridCellKind.Custom,
    }),
    title: 'Resource Pool',
    tooltip: () => undefined,
    width: columnWidths.resourcePool ?? defaultColumnWidths.resourcePool ?? MIN_COLUMN_WIDTH,
  },
  searcherMetric: {
    id: 'searcherMetric',
    isNumerical: false,
    renderer: (record: FlatRun) => {
      const sMetric = record.experiment?.searcherMetric ?? '';
      return {
        allowOverlay: false,
        copyData: sMetric,
        data: { kind: TEXT_CELL },
        kind: GridCellKind.Custom,
      };
    },
    title: 'Searcher Metric',
    tooltip: () => undefined,
    width: columnWidths.searcherMetric ?? defaultColumnWidths.searcherMetric ?? MIN_COLUMN_WIDTH,
  },
  searcherMetricsVal: {
    id: 'searcherMetricsVal',
    isNumerical: true,
    renderer: (record: FlatRun) => {
      const sMetricValue = record.searcherMetricValue;

      return {
        allowOverlay: false,
        copyData: sMetricValue
          ? typeof sMetricValue === 'number'
            ? humanReadableNumber(sMetricValue)
            : sMetricValue
          : '',
        data: { kind: TEXT_CELL },
        kind: GridCellKind.Custom,
      };
    },
    title: 'Searcher Metric Value',
    tooltip: () => undefined,
    width:
      columnWidths.searcherMetricsVal ?? defaultColumnWidths.searcherMetricsVal ?? MIN_COLUMN_WIDTH,
  },
  searcherType: {
    id: 'searcherType',
    renderer: (record: FlatRun) => ({
      allowOverlay: false,
      copyData: String(record.experiment?.searcherType),
      data: { kind: TEXT_CELL },
      kind: GridCellKind.Custom,
    }),
    title: 'Searcher Type',
    tooltip: () => undefined,
    width: columnWidths.searcherType ?? defaultColumnWidths.searcherType ?? MIN_COLUMN_WIDTH,
  },
  startTime: {
    id: 'startTime',
    isNumerical: true,
    renderer: (record: FlatRun) => ({
      allowOverlay: false,
      copyData: getTimeInEnglish(new Date(record.startTime)),
      data: { kind: TEXT_CELL },
      kind: GridCellKind.Custom,
    }),
    title: 'Start Time',
    tooltip: () => undefined,
    width: columnWidths.startTime ?? defaultColumnWidths.startTime ?? MIN_COLUMN_WIDTH,
  },
  state: {
    id: 'state',
    renderer: (record: FlatRun) => ({
      allowAdd: false,
      allowOverlay: true,
      copyData: capitalize(record.state),
      data: {
        appTheme,
        kind: STATE_CELL,
        state: getCellStateFromExperimentState(record.state),
      },
      kind: GridCellKind.Custom,
    }),
    themeOverride: { cellHorizontalPadding: 13 },
    title: 'State',
    tooltip: (record: FlatRun) => capitalize(record.state),
    width: columnWidths.state ?? defaultColumnWidths.state ?? MIN_COLUMN_WIDTH,
  },
  tags: {
    id: 'tags',
    renderer: (record: FlatRun) => ({
      allowOverlay: true,
      copyData: record.labels?.join(', ') ?? '',
      data: {
        kind: TAGS_CELL,
        possibleTags: [],
        readonly: true,
        tags: record.labels,
      },
      kind: GridCellKind.Custom,
    }),
    title: 'Tags',
    tooltip: () => undefined,
    width: columnWidths.tags ?? defaultColumnWidths.tags ?? MIN_COLUMN_WIDTH,
  },
  user: {
    id: 'user',
    renderer: (record: FlatRun) => {
      const displayName = Loadable.match(users, {
        _: () => undefined,
        Loaded: (users) => getDisplayName(users?.find((u) => u.id === record.userId)),
      });
      return {
        allowOverlay: true,
        copyData: String(record.userId),
        data: {
          image: undefined,
          initials: getInitials(displayName),
          kind: USER_AVATAR_CELL,
          tint: getColor(displayName, themeIsDark),
        },
        kind: GridCellKind.Custom,
      };
    },
    title: 'User',
    tooltip: (record: FlatRun) => {
      return Loadable.match(users, {
        _: () => undefined,
        Loaded: (users) => getDisplayName(users?.find((u) => u.id === record.userId)),
      });
    },
    width: columnWidths.user ?? defaultColumnWidths.user ?? MIN_COLUMN_WIDTH,
  },
});

export const defaultColumnWidths: Partial<Record<RunColumn, number>> = {
  checkpointCount: 120,
  checkpointSize: 110,
  duration: 86,
  experimentDescription: 148,
  experimentId: 60,
  experimentName: 290,
  experimentProgress: 65,
  externalExperimentId: 160,
  externalRunId: 130,
  forkedFrom: 86,
  id: 50,
  parentArchived: 80,
  resourcePool: 140,
  searcherMetric: 120,
  searcherMetricsVal: 120,
  searcherType: 120,
  startTime: 118,
  state: 60,
  tags: 106,
  user: 50,
};
