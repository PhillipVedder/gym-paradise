'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- This inline SVG diagram needs image semantics; it cannot be replaced by an HTML img. */
import { Download, ArrowUpRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { EXAMPLE_LAYOUT, EXAMPLE_ZONES } from '@/lib/gym-example';
import { EQUIPMENT } from '@/lib/gym-data';

export function GymExampleDialog({
  open,
  onOpenChange,
  onLoad,
  onDownload,
  onBackup,
  enabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoad: () => void;
  onDownload: () => void;
  onBackup: () => void;
  enabled: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gym-dialog example-dialog">
        <DialogHeader>
          <DialogTitle>Paradise showcase</DialogTitle>
          <DialogDescription>
            32 × 36 m · {EXAMPLE_LAYOUT.items.length} pieces · all{' '}
            {new Set(EXAMPLE_LAYOUT.items.map((i) => i.kind)).size} equipment
            types
          </DialogDescription>
        </DialogHeader>
        <div className="example-overview">
          <svg
            viewBox="0 0 320 382"
            role="img"
            aria-label="Floor plan: free weights and cables at the back, strength machines in the middle, boxing and cardio near the entrance, with a clear central walkway."
          >
            <rect
              x="0"
              y="0"
              width="320"
              height="360"
              rx="5"
              fill="#12131c"
              stroke="#61546e"
            />
            {EXAMPLE_ZONES.map((zone, index) => (
              <g key={zone.name}>
                <rect
                  x={(zone.area[0] + 16) * 10}
                  y={(18 - zone.area[1] - zone.area[3]) * 10}
                  width={zone.area[2] * 10}
                  height={zone.area[3] * 10}
                  rx="5"
                  fill={zone.color}
                  fillOpacity="0.12"
                />
                {zone.pieces.map(([kind, x, z, rotation = 0], n) => {
                  const e = EQUIPMENT[kind];
                  return (
                    <rect
                      key={n}
                      x={-e.width * 5}
                      y={-e.depth * 5}
                      width={e.width * 10}
                      height={e.depth * 10}
                      rx="1.5"
                      transform={`translate(${(x + 16) * 10} ${(18 - z) * 10}) rotate(${(-rotation * 180) / Math.PI})`}
                      fill={zone.color}
                      fillOpacity="0.65"
                    >
                      <title>{e.name}</title>
                    </rect>
                  );
                })}
                <text
                  x={(zone.area[0] + 16) * 10 + 8}
                  y={(18 - zone.area[1] - zone.area[3]) * 10 + 17}
                  fill={zone.color}
                  fontSize="13"
                  fontWeight="700"
                >
                  {index + 1}
                </text>
              </g>
            ))}
            <path
              d="M160 350 V18"
              stroke="#b28ace"
              strokeWidth="1"
              strokeDasharray="4 5"
            />
            <text
              x="160"
              y="378"
              textAnchor="middle"
              fill="#c7bbd7"
              fontSize="12"
            >
              ENTRANCE
            </text>
          </svg>
          <div>
            <ol className="example-zones">
              {EXAMPLE_ZONES.map((zone, index) => (
                <li key={zone.name}>
                  <span style={{ color: zone.color }}>{index + 1}</span>
                  <div>
                    <strong>{zone.name}</strong>
                    <small>{zone.pieces.length} pieces</small>
                  </div>
                </li>
              ))}
            </ol>
            <p className="example-caption">
              Purple lighting, a mirrored mural wall, three benches and a
              dedicated sled lane.
            </p>
          </div>
        </div>
        <p className="example-replace-note">
          Loading replaces your current layout. Undo restores it during this
          session. Your collection and training records stay saved.
        </p>
        <button className="primary-button" onClick={onLoad} disabled={!enabled}>
          Load example gym <ArrowUpRight size={18} />
        </button>
        <div className="example-file-actions">
          <button onClick={onBackup} disabled={!enabled}>
            <Download size={16} />
            Save current layout
          </button>
          <button onClick={onDownload}>
            <Download size={16} />
            Download example
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
