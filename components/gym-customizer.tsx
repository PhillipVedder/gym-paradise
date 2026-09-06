'use client';
import { useState, type ReactNode } from 'react';
import {
  Paintbrush,
  Maximize2,
  Minimize2,
  Upload,
  Footprints,
  Check,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  designFor,
  roomSize,
  MAX_ROOM_DIMENSION,
  WALL_SIDES,
  DESIGN_PRESETS,
  type GymDesign,
  type WallSide,
} from '@/lib/gym-design';
import { type GymLayout, type PlacedItem, EQUIPMENT } from '@/lib/gym-data';

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly (string | readonly [string, string])[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="custom-field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option
            key={typeof o === 'string' ? o : o[0]}
            value={typeof o === 'string' ? o : o[0]}
          >
            {typeof o === 'string' ? o[0].toUpperCase() + o.slice(1) : o[1]}
          </option>
        ))}
      </select>
    </label>
  );
}
function Color({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <label className="custom-color">
      <span>
        {label}
        <small>{draft.toUpperCase()}</small>
      </span>
      <input
        type="color"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== value) onChange(draft);
        }}
      />
    </label>
  );
}
function Range({
  label,
  value,
  min,
  max,
  step = 0.05,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (n: number) => string;
  onChange: (n: number) => void;
}) {
  const [draft, setDraft] = useState(value);
  const apply = () => {
    if (draft !== value) onChange(draft);
  };
  return (
    <label className="custom-range">
      <span>
        {label}
        <output>
          {format ? format(draft) : `${Math.round(draft * 100)}%`}
        </output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(e) => setDraft(e.target.valueAsNumber)}
        onPointerUp={apply}
        onKeyUp={apply}
        onBlur={apply}
      />
    </label>
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="custom-toggle">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
function Section({
  title,
  subtitle,
  children,
  open = false,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className="custom-section" open={open || undefined}>
      <summary>
        <span>
          {title}
          <small>{subtitle}</small>
        </span>
        <span aria-hidden="true">+</span>
      </summary>
      <div className="custom-section-content">{children}</div>
    </details>
  );
}
function Dimensions({
  layout,
  onChange,
}: {
  layout: GymLayout;
  onChange: (next: GymLayout) => boolean;
}) {
  const current = roomSize(layout);
  const [size, setSize] = useState(current);
  const [message, setMessage] = useState('');
  return (
    <form
      className="room-dimensions"
      onSubmit={(e) => {
        e.preventDefault();
        if (onChange({ ...layout, room: size }))
          setMessage('Room size applied.');
        else
          setMessage(
            'The room could not be resized. Move equipment inside the new boundaries first.',
          );
      }}
    >
      <div className="dimension-fields">
        {(['width', 'depth', 'height'] as const).map((key) => (
          <label className="custom-field" key={key}>
            <span>
              {key === 'depth'
                ? 'Length'
                : key === 'height'
                  ? 'Height'
                  : 'Width'}{' '}
              (m)
            </span>
            <input
              type="number"
              inputMode="decimal"
              required
              min={key === 'height' ? 3.5 : 6}
              max={key === 'height' ? 10 : MAX_ROOM_DIMENSION}
              step="0.5"
              value={Number.isNaN(size[key]) ? '' : size[key]}
              onChange={(e) => {
                setSize({ ...size, [key]: e.target.valueAsNumber });
                setMessage('');
              }}
            />
          </label>
        ))}
      </div>
      <button className="custom-apply" type="submit">
        Apply room size{' '}
        <span>
          {Number.isFinite(size.width * size.depth)
            ? `${size.width * size.depth} m²`
            : ''}
        </span>
      </button>
      <output className="custom-hint">
        {message ||
          'Up to 500 m per side. Machines keep their positions; smaller rooms must still fit them.'}
      </output>
    </form>
  );
}
export function GymCustomizer({
  layout,
  onChange,
  enabled,
  uploadArt,
  artBusy,
  explore,
  ceilingVisible,
  onCeiling,
  expanded,
  onExpand,
}: {
  layout: GymLayout;
  onChange: (next: GymLayout) => boolean;
  enabled: boolean;
  uploadArt: (file?: File) => void;
  artBusy: boolean;
  explore: () => void;
  ceilingVisible: boolean;
  onCeiling: (show: boolean) => void;
  expanded: boolean;
  onExpand: () => void;
}) {
  const d = designFor(layout),
    size = roomSize(layout);
  const set = <K extends keyof GymDesign>(key: K, value: GymDesign[K]) =>
    onChange({ ...layout, design: { ...d, [key]: value } });
  const color = (
    label: string,
    key:
      | 'lightColor'
      | 'floorColor'
      | 'turfColor'
      | 'frameColor'
      | 'upholsteryColor'
      | 'signColor',
  ) => (
    <Color
      key={`${key}-${d[key]}`}
      label={label}
      value={d[key]}
      onChange={(v) => set(key, v)}
    />
  );
  const range = (
    label: string,
    key:
      | 'brightness'
      | 'artWidth'
      | 'artHeight'
      | 'artPosition'
      | 'turfWidth'
      | 'turfLength'
      | 'turfX'
      | 'turfZ',
    min: number,
    max: number,
    format?: (n: number) => string,
  ) => (
    <Range
      key={`${key}-${d[key]}`}
      label={label}
      value={d[key]}
      min={min}
      max={max}
      format={format}
      onChange={(v) => set(key, v)}
    />
  );
  return (
    <div className={`customizer ${expanded ? 'expanded' : ''}`}>
      <div className="customizer-heading">
        <div>
          <span className="eyebrow">MAKE IT YOURS</span>
          <h2>Your space. Every detail.</h2>
        </div>
        <button
          className="icon-button customizer-expand"
          aria-label={
            expanded
              ? 'Collapse customisation panel'
              : 'Expand customisation panel'
          }
          aria-expanded={expanded}
          onClick={onExpand}
        >
          {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>
      <fieldset className="customizer-controls" disabled={!enabled}>
        <div className="design-presets" aria-label="Room design presets">
          {DESIGN_PRESETS.map((p) => (
            <button
              key={p.id}
              aria-label={`Apply ${p.name} design preset`}
              style={{ '--preset-color': p.color } as React.CSSProperties}
              onClick={() =>
                onChange({
                  ...layout,
                  floor: p.floor,
                  mural: p.mural,
                  design: structuredClone(p.design),
                })
              }
            >
              <span className="preset-dot" />
              <span>
                <strong>{p.name}</strong>
                <small>{p.detail}</small>
              </span>
            </button>
          ))}
        </div>
        <p className="custom-hint preset-hint">
          Choose a starting look, then change any finish below. Your machines
          stay in place.
        </p>
        <Section
          title="Room & architecture"
          subtitle={`${size.width} × ${size.depth} m · ${size.height} m ceiling`}
          open
        >
          <Dimensions
            key={`${size.width}-${size.depth}-${size.height}`}
            layout={layout}
            onChange={onChange}
          />
          <Select
            label="Ceiling"
            value={d.ceiling}
            options={[
              ['industrial', 'Exposed warehouse'],
              ['tiles', 'Commercial ceiling tiles'],
              ['open', 'Open roof'],
            ]}
            onChange={(v) => set('ceiling', v as GymDesign['ceiling'])}
          />
          <Select
            label="Daylight windows"
            value={d.windows}
            options={['none', 'left', 'right', 'front']}
            onChange={(v) => set('windows', v as GymDesign['windows'])}
          />
          <Toggle
            label="Preview roof in Build"
            checked={ceilingVisible}
            onChange={onCeiling}
          />
          <button className="custom-link" onClick={explore}>
            <Footprints size={16} /> View from inside
          </button>
        </Section>
        <Section
          title="Lighting"
          subtitle="Fixtures, accent colour & brightness"
        >
          <Select
            label="Light fixtures"
            value={d.fixtures}
            options={[
              ['frames', 'Suspended LED rectangles'],
              ['strips', 'Linear light strips'],
              ['panels', 'White ceiling panels'],
            ]}
            onChange={(v) => set('fixtures', v as GymDesign['fixtures'])}
          />
          {color('Accent colour', 'lightColor')}
          {range('Room brightness', 'brightness', 0.3, 2)}
        </Section>
        <Section
          title="Walls, floor & mirrors"
          subtitle="Colours and materials for your room"
        >
          <Select
            label="Wall surface"
            value={d.wallFinish}
            options={['paint', 'concrete', 'brick']}
            onChange={(v) => set('wallFinish', v as GymDesign['wallFinish'])}
          />
          {WALL_SIDES.map((side) => (
            <Color
              key={`${side}-${d.wallColors[side]}`}
              label={`${side[0].toUpperCase() + side.slice(1)} wall`}
              value={d.wallColors[side]}
              onChange={(v) =>
                set('wallColors', { ...d.wallColors, [side]: v })
              }
            />
          ))}
          <Select
            label="Floor surface"
            value={layout.floor || 'rubber'}
            options={[
              ['rubber', 'Speckled rubber'],
              ['concrete', 'Polished concrete'],
            ]}
            onChange={(v) =>
              onChange({ ...layout, floor: v as GymLayout['floor'] })
            }
          />
          {color('Floor colour', 'floorColor')}
          <Toggle
            label="Floor tile seams"
            checked={d.floorGrid}
            onChange={(v) => set('floorGrid', v)}
          />
          <Select
            label="Mirror wall"
            value={d.mirrorWall}
            options={['none', ...WALL_SIDES]}
            onChange={(v) => set('mirrorWall', v as GymDesign['mirrorWall'])}
          />
        </Section>
        <Section
          title="Wall art & signage"
          subtitle="Upload artwork and name your paradise"
        >
          <Toggle
            label="Show wall art"
            checked={layout.mural}
            onChange={(v) => onChange({ ...layout, mural: v })}
          />
          <Select
            label="Artwork wall"
            value={d.artWall}
            options={WALL_SIDES}
            onChange={(v) => set('artWall', v as WallSide)}
          />
          {range('Artwork maximum width', 'artWidth', 0.2, 1)}
          {range('Artwork maximum height', 'artHeight', 0.15, 0.65)}
          {range('Artwork vertical position', 'artPosition', 0, 1)}
          <p className="custom-hint">
            Artwork keeps its original proportions inside these limits, even
            when you resize the room.
          </p>
          <label className="custom-upload">
            <Upload size={16} />
            {artBusy ? 'Uploading artwork…' : 'Upload your wall art'}
            <input
              type="file"
              accept="image/*"
              disabled={artBusy || !enabled}
              onChange={(e) => {
                uploadArt(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          {layout.muralId && (
            <button
              className="custom-link"
              onClick={() => onChange({ ...layout, muralId: undefined })}
            >
              Use Paradise original artwork
            </button>
          )}
          <Toggle
            label="Show custom wall sign"
            checked={d.sign}
            onChange={(v) => set('sign', v)}
          />
          <label className="custom-field">
            <span>Your wall sign</span>
            <input
              key={d.signText}
              defaultValue={d.signText}
              maxLength={60}
              onBlur={(e) => {
                if (e.target.value !== d.signText)
                  set('signText', e.target.value);
              }}
            />
          </label>
          <Select
            label="Sign wall"
            value={d.signWall}
            options={WALL_SIDES}
            onChange={(v) => set('signWall', v as WallSide)}
          />
          {color('Sign colour', 'signColor')}
        </Section>
        <Section
          title="Training turf"
          subtitle="Move, resize and recolour your lane"
        >
          <Toggle
            label="Show turf lane"
            checked={d.turf}
            onChange={(v) => set('turf', v)}
          />
          {color('Turf colour', 'turfColor')}
          {range('Lane width', 'turfWidth', 1, 5, (n) => `${n.toFixed(2)} m`)}
          {range('Lane length', 'turfLength', 0.2, 1)}
          {range('Left ↔ right', 'turfX', -1, 1, (n) =>
            n === 0
              ? 'Centre'
              : `${Math.round(Math.abs(n) * 100)}% ${n < 0 ? 'left' : 'right'}`,
          )}
          {range('Entry ↔ back', 'turfZ', -1, 1, (n) =>
            n === 0
              ? 'Centre'
              : `${Math.round(Math.abs(n) * 100)}% ${n < 0 ? 'entry' : 'back'}`,
          )}
          <p className="custom-hint">
            Turf stays inside the room when you resize it. Place sleds and other
            equipment from the library.
          </p>
        </Section>
        <Section
          title="Equipment finishes"
          subtitle="Your default frame and upholstery colours"
        >
          {color('Default frame colour', 'frameColor')}
          {color('Default upholstery', 'upholsteryColor')}
          <p className="custom-hint">
            Select a machine and tap the paintbrush to give it its own colours.
          </p>
          <button
            className="custom-link"
            onClick={() =>
              onChange({
                ...layout,
                items: layout.items.map(
                  ({ frameColor: _f, upholsteryColor: _u, ...i }) => i,
                ),
              })
            }
          >
            Apply room colours to every piece
          </button>
        </Section>
      </fieldset>
    </div>
  );
}
export function MachineFinishDialog({
  item,
  layout,
  onChange,
  open,
  onOpenChange,
}: {
  item?: PlacedItem;
  layout: GymLayout;
  onChange: (layout: GymLayout) => boolean;
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const d = designFor(layout);
  const set = (key: 'frameColor' | 'upholsteryColor', value: string) =>
    item &&
    onChange({
      ...layout,
      items: layout.items.map((i) =>
        i.id === item.id ? { ...i, [key]: value } : i,
      ),
    });
  return (
    <Dialog open={open && !!item} onOpenChange={onOpenChange}>
      <DialogContent className="finish-dialog">
        <DialogHeader>
          <DialogTitle>
            <Paintbrush size={20} /> Personalise this piece
          </DialogTitle>
          <DialogDescription>
            {item ? EQUIPMENT[item.kind].name : ''} · Give it its own frame and
            padding colours.
          </DialogDescription>
        </DialogHeader>
        {item && (
          <div className="finish-fields">
            <Color
              key={`frame-${item.id}-${item.frameColor || d.frameColor}`}
              label="Frame colour"
              value={item.frameColor || d.frameColor}
              onChange={(v) => set('frameColor', v)}
            />
            <Color
              key={`pad-${item.id}-${item.upholsteryColor || d.upholsteryColor}`}
              label="Upholstery / canvas"
              value={item.upholsteryColor || d.upholsteryColor}
              onChange={(v) => set('upholsteryColor', v)}
            />
            <button
              className="custom-link"
              onClick={() =>
                onChange({
                  ...layout,
                  items: layout.items.map((i) =>
                    i.id === item.id
                      ? {
                          ...i,
                          frameColor: undefined,
                          upholsteryColor: undefined,
                        }
                      : i,
                  ),
                })
              }
            >
              Use room colours
            </button>
            <button
              className="primary-button"
              onClick={() => onOpenChange(false)}
            >
              <Check size={17} /> Done
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
