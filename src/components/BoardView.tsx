import { useCallback, useState } from 'react';

import { STATUS, type Application, type StatusId } from '../types';
import { ApplicationCard } from './ApplicationCard';

interface Props {
  rows: Application[];
  onOpen: (id: string) => void;
  onMove: (id: string, to: StatusId) => void;
}

export function BoardView({ rows, onOpen, onMove }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<StatusId | null>(null);
  // 引用要稳定，否则下面 ApplicationCard 的 memo 白做
  const clearDragging = useCallback(() => setDraggingId(null), []);

  return (
    <div className="board">
      {STATUS.map((st) => {
        const mine = rows.filter((a) => a.status === st.id);
        return (
          <div
            key={st.id}
            className={`col${overCol === st.id ? ' drag-over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setOverCol(st.id);
            }}
            onDragLeave={(e) => {
              // 只在真正离开整列时清掉高亮，掠过子元素不算
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOverCol(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setOverCol(null);
              setDraggingId(null);
              const id = e.dataTransfer.getData('text/plain');
              if (id) onMove(id, st.id);
            }}
          >
            <div className="col-head" style={{ ['--tone' as string]: st.tone }}>
              <span className="glyph" aria-hidden="true">
                {st.glyph}
              </span>
              <span className="name">{st.label}</span>
              <span className="n">{mine.length}</span>
            </div>

            <div className="col-body">
              {mine.length > 0 ? (
                mine.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    app={app}
                    onOpen={onOpen}
                    dragging={draggingId === app.id}
                    onDragStart={setDraggingId}
                    onDragEnd={clearDragging}
                  />
                ))
              ) : (
                <div className="col-empty">拖动卡片到这里</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
