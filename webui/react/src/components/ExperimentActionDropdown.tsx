import { GridCell } from '@glideapps/glide-data-grid';
import Button from 'hew/Button';
import { ContextMenuCompleteHandlerProps } from 'hew/DataGrid/contextMenu';
import Dropdown, { DropdownEvent, MenuItem } from 'hew/Dropdown';
import Icon from 'hew/Icon';
import { useModal } from 'hew/Modal';
import { useToast } from 'hew/Toast';
import useConfirm from 'hew/useConfirm';
import { copyToClipboard } from 'hew/utils/functions';
import { Failed, Loadable, Loaded, NotLoaded } from 'hew/utils/loadable';
import React, { MouseEvent, useCallback, useMemo, useRef, useState } from 'react';

import css from 'components/ActionDropdown/ActionDropdown.module.scss';
import ExperimentEditModalComponent from 'components/ExperimentEditModal';
import ExperimentMoveModalComponent from 'components/ExperimentMoveModal';
import ExperimentRetainLogsModalComponent from 'components/ExperimentRetainLogsModal';
import HyperparameterSearchModalComponent from 'components/HyperparameterSearchModal';
import InterstitialModalComponent, {
  type onInterstitialCloseActionType,
} from 'components/InterstitialModalComponent';
import usePermissions from 'hooks/usePermissions';
import { handlePath } from 'routes/utils';
import {
  activateExperiment,
  archiveExperiment,
  cancelExperiment,
  deleteExperiment,
  getExperiment,
  killExperiment,
  openOrCreateTensorBoard,
  pauseExperiment,
  unarchiveExperiment,
} from 'services/api';
import {
  BulkExperimentItem,
  ExperimentAction,
  FullExperimentItem,
  ProjectExperiment,
  ValueOf,
} from 'types';
import handleError, { ErrorLevel, ErrorType } from 'utils/error';
import { getActionsForExperiment } from 'utils/experiment';
import { capitalize } from 'utils/string';
import { openCommandResponse } from 'utils/wait';

interface Props {
  children?: React.ReactNode;
  cell?: GridCell;
  experiment: ProjectExperiment;
  isContextMenu?: boolean;
  link?: string;
  makeOpen?: boolean;
  onComplete?: ContextMenuCompleteHandlerProps<ExperimentAction, BulkExperimentItem>;
  onLink?: () => void;
  onVisibleChange?: (visible: boolean) => void;
  workspaceId?: number;
}

const Action = {
  Copy: 'Copy Value',
  NewTab: 'Open Link in New Tab',
  NewWindow: 'Open Link in New Window',
  ...ExperimentAction,
};

type Action = ValueOf<typeof Action>;

const dropdownActions = [
  Action.SwitchPin,
  Action.Activate,
  Action.Pause,
  Action.Archive,
  Action.Unarchive,
  Action.Cancel,
  Action.Kill,
  Action.Edit,
  Action.Move,
  Action.RetainLogs,
  Action.OpenTensorBoard,
  Action.HyperparameterSearch,
  Action.Delete,
];

const ExperimentActionDropdown: React.FC<Props> = ({
  experiment,
  cell,
  isContextMenu,
  link,
  makeOpen,
  onComplete,
  onLink,
  onVisibleChange,
  children,
}: Props) => {
  const id = experiment.id;
  const ExperimentEditModal = useModal(ExperimentEditModalComponent);
  const ExperimentMoveModal = useModal(ExperimentMoveModalComponent);
  const ExperimentRetainLogsModal = useModal(ExperimentRetainLogsModalComponent);
  const {
    Component: HyperparameterSearchModal,
    open: hyperparameterSearchModalOpen,
    close: hyperparameterSearchModalClose,
  } = useModal(HyperparameterSearchModalComponent);
  const {
    Component: InterstitialModal,
    open: interstitialModalOpen,
    close: interstitialModalClose,
  } = useModal(InterstitialModalComponent);
  const [experimentItem, setExperimentItem] = useState<Loadable<FullExperimentItem>>(NotLoaded);
  const canceler = useRef<AbortController>(new AbortController());
  const confirm = useConfirm();
  const { openToast } = useToast();

  // this is required when experiment does not contain `config`.
  // since we removed config. See #8765 on GitHub
  const fetchedExperimentItem = useCallback(async () => {
    try {
      setExperimentItem(NotLoaded);
      const response: FullExperimentItem = await getExperiment(
        { id: experiment.id },
        { signal: canceler.current.signal },
      );
      setExperimentItem(Loaded(response));
    } catch (e) {
      handleError(e, { publicSubject: 'Unable to fetch experiment data.' });
      setExperimentItem(Failed(new Error('experiment data failure')));
    }
  }, [experiment.id]);

  const onInterstitalClose: onInterstitialCloseActionType = useCallback(
    (reason) => {
      switch (reason) {
        case 'ok':
          hyperparameterSearchModalOpen();
          break;
        case 'failed':
          break;
        case 'close':
          canceler.current.abort();
          canceler.current = new AbortController();
          break;
      }
      interstitialModalClose(reason);
    },
    [hyperparameterSearchModalOpen, interstitialModalClose],
  );

  const handleEditComplete = useCallback(
    (data: Partial<BulkExperimentItem>) => {
      onComplete?.(ExperimentAction.Edit, id, data);
    },
    [id, onComplete],
  );

  const handleMoveComplete = useCallback(() => {
    onComplete?.(ExperimentAction.Move, id);
  }, [id, onComplete]);

  const handleRetainLogsComplete = useCallback(() => {
    onComplete?.(ExperimentAction.RetainLogs, id);
  }, [id, onComplete]);

  const menuItems = getActionsForExperiment(experiment, dropdownActions, usePermissions())
    .filter((action) => action !== Action.SwitchPin)
    .map((action) => {
      return { danger: action === Action.Delete, key: action, label: action };
    });

  const dropdownMenu = useMemo(() => {
    const items: MenuItem[] = [...menuItems];
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    if (cell && (cell.copyData || (cell as any).displayData)) {
      items.unshift({ key: Action.Copy, label: Action.Copy });
    }
    if (link) {
      items.unshift(
        { key: Action.NewTab, label: Action.NewTab },
        { key: Action.NewWindow, label: Action.NewWindow },
        { type: 'divider' },
      );
    }
    return items;
  }, [link, menuItems, cell]);

  const handleDropdown = useCallback(
    async (action: string, e: DropdownEvent) => {
      try {
        switch (action) {
          case Action.NewTab:
            handlePath(e as MouseEvent, { path: link, popout: 'tab' });
            await onLink?.();
            break;
          case Action.NewWindow:
            handlePath(e as MouseEvent, { path: link, popout: 'window' });
            await onLink?.();
            break;
          case Action.Activate:
            await activateExperiment({ experimentId: id });
            await onComplete?.(action, id);
            break;
          case Action.Archive:
            await archiveExperiment({ experimentId: id });
            await onComplete?.(action, id);
            break;
          case Action.Cancel:
            await cancelExperiment({ experimentId: id });
            await onComplete?.(action, id);
            break;
          case Action.OpenTensorBoard: {
            const commandResponse = await openOrCreateTensorBoard({
              experimentIds: [id],
              workspaceId: experiment.workspaceId,
            });
            openCommandResponse(commandResponse);
            break;
          }
          case Action.SwitchPin: {
            // TODO: leaving old code behind for when we want to enable this for our current experiment list.
            // const newPinned = { ...(settings?.pinned ?? {}) };
            // const pinSet = new Set(newPinned[experiment.projectId]);
            // if (pinSet.has(id)) {
            //   pinSet.delete(id);
            // } else {
            //   if (pinSet.size >= 5) {
            //     notification.warning({
            //       description: 'Up to 5 pinned items',
            //       message: 'Unable to pin this item',
            //     });
            //     break;
            //   }
            //   pinSet.add(id);
            // }
            // newPinned[experiment.projectId] = Array.from(pinSet);
            // updateSettings?.({ pinned: newPinned });
            // await onComplete?.(action, id);
            break;
          }
          case Action.Kill:
            confirm({
              content: `Are you sure you want to kill experiment ${id}?`,
              danger: true,
              okText: 'Kill',
              onConfirm: async () => {
                await killExperiment({ experimentId: id });
                await onComplete?.(action, id);
              },
              onError: handleError,
              title: 'Confirm Experiment Kill',
            });
            break;
          case Action.Pause:
            await pauseExperiment({ experimentId: id });
            await onComplete?.(action, id);
            break;
          case Action.Unarchive:
            await unarchiveExperiment({ experimentId: id });
            await onComplete?.(action, id);
            break;
          case Action.Delete:
            confirm({
              content: `Are you sure you want to delete experiment ${id}?`,
              danger: true,
              okText: 'Delete',
              onConfirm: async () => {
                await deleteExperiment({ experimentId: id });
                await onComplete?.(action, id);
              },
              onError: handleError,
              title: 'Confirm Experiment Deletion',
            });
            break;
          case Action.Edit:
            ExperimentEditModal.open();
            break;
          case Action.Move:
            ExperimentMoveModal.open();
            break;
          case Action.RetainLogs:
            ExperimentRetainLogsModal.open();
            break;
          case Action.HyperparameterSearch:
            interstitialModalOpen();
            fetchedExperimentItem();
            break;
          case Action.Copy:
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            await copyToClipboard((cell as any).displayData || cell?.copyData);
            openToast({
              severity: 'Confirm',
              title: 'Value has been copied to clipboard.',
            });
            break;
        }
      } catch (e) {
        handleError(e, {
          level: ErrorLevel.Error,
          publicMessage: `Unable to ${action} experiment ${id}.`,
          publicSubject: `${capitalize(action)} failed.`,
          silent: false,
          type: ErrorType.Server,
        });
      } finally {
        onVisibleChange?.(false);
      }
    },
    [
      link,
      onLink,
      id,
      onComplete,
      confirm,
      ExperimentEditModal,
      ExperimentMoveModal,
      ExperimentRetainLogsModal,
      interstitialModalOpen,
      fetchedExperimentItem,
      cell,
      openToast,
      experiment.workspaceId,
      onVisibleChange,
    ],
  );

  if (menuItems.length === 0) {
    return (
      (children as JSX.Element) ?? (
        <div className={css.base} title="No actions available">
          <Button disabled type="text">
            <Icon name="overflow-vertical" title="Disabled action menu" />
          </Button>
        </div>
      )
    );
  }

  const shared = (
    <>
      <ExperimentEditModal.Component
        description={experiment.description ?? ''}
        experimentId={experiment.id}
        experimentName={experiment.name}
        onEditComplete={handleEditComplete}
      />
      <ExperimentMoveModal.Component
        experimentIds={[id]}
        sourceProjectId={experiment.projectId}
        sourceWorkspaceId={experiment.workspaceId}
        onSubmit={handleMoveComplete}
      />
      <ExperimentRetainLogsModal.Component
        experimentIds={[id]}
        onSubmit={handleRetainLogsComplete}
      />
      {experimentItem.isLoaded && (
        <HyperparameterSearchModal
          closeModal={hyperparameterSearchModalClose}
          experiment={experimentItem.data}
        />
      )}
      <InterstitialModal loadableData={experimentItem} onCloseAction={onInterstitalClose} />
    </>
  );

  return children ? (
    <>
      <Dropdown
        isContextMenu={isContextMenu}
        menu={dropdownMenu}
        open={makeOpen}
        onClick={handleDropdown}>
        {children}
      </Dropdown>
      {shared}
    </>
  ) : (
    <div className={css.base} title="Open actions menu">
      <Dropdown menu={dropdownMenu} placement="bottomRight" onClick={handleDropdown}>
        <Button icon={<Icon name="overflow-vertical" size="small" title="Action menu" />} />
      </Dropdown>
      {shared}
    </div>
  );
};

export default ExperimentActionDropdown;
