import { BACKUP_SNOOZE_DAYS, backupNotice } from '../lib/backup';
import { localISO } from '../lib/date';
import { useStore } from '../store/StoreContext';

/**
 * 「该备份了」提醒。localStorage 不是永久存储 —— Safari 的 ITP 会在长期不访问后
 * 清掉可被脚本写入的存储，清浏览数据、换设备也一样会丢，所以要主动提醒。
 */
export function BackupNotice({ onExport }: { onExport: () => void }) {
  const { state, dispatch } = useStore();
  const notice = backupNotice(state);
  if (!notice) return null;

  return (
    <div className="backup-notice" role="status">
      <span className="backup-icon" aria-hidden="true">
        ⇩
      </span>
      <div className="backup-body">
        <strong>
          {notice.never
            ? '这些记录还没有备份过。'
            : `已经 ${notice.days} 天没有导出备份了（上次 ${localISO(state.lastExportedAt!)}）。`}
        </strong>
        数据只存在这个浏览器里。清缓存、换设备，或者长时间不打开（Safari 会主动清理），
        记录就没了。导出一份 JSON 收着，几秒钟的事。
      </div>
      <div className="backup-actions">
        <button type="button" className="btn btn-sm btn-primary" onClick={onExport}>
          立即导出
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={() => dispatch({ type: 'snoozeBackup' })}
        >
          {BACKUP_SNOOZE_DAYS} 天后再说
        </button>
      </div>
    </div>
  );
}
