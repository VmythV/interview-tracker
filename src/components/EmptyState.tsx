export function EmptyState({
  onNew,
  onLoadSample,
}: {
  onNew: () => void;
  onLoadSample: () => void;
}) {
  return (
    <div className="empty">
      <h2>还没有任何投递记录</h2>
      <p>
        记录每一家公司的进度、面试轮次、时间地点和结果。所有数据只保存在这台设备的浏览器里，不会上传。
      </p>
      {/* 直接说明视图为什么还没出现，省得用户以为切换按钮坏了 */}
      <p className="empty-hint">有了第一条记录之后，看板、日历、列表和统计视图才会出现。</p>
      <div className="empty-actions">
        <button type="button" className="btn btn-primary" onClick={onNew}>
          ＋ 新建第一条投递
        </button>
        <button type="button" className="btn" onClick={onLoadSample}>
          载入示例数据看看
        </button>
      </div>
    </div>
  );
}
