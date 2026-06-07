
# Prompt 8 — Plan Schema & Full Customization

This is large. To keep it shippable in one pass without breaking the existing builder, runtime, or hexagon, I'll do it in **two phases**. Phase 1 lands the data model + builder UI + org libraries (the keystone). Phase 2 wires the schema into generation and the manual editor. Confirm scope before I start coding.

## Phase 1 — Schema, libraries, builder UI (recommended now)

### 1. Types (`src/data/lifeplan-types.ts`)
Add — keep existing types untouched:
```
FieldType = "short_text" | "long_text" | "rich_text" | "single_select"
          | "multi_select" | "date" | "number" | "taxonomy_tag"
          | "repeater" | "document_list" | "signature"
PlanSubField { id, label, type (non-repeater), required, option_set_id?, sort_order }
PlanField    { id, label, type, required, help_text?, ai_instruction?,
               option_set_id?, caretracker_mapping?, source_mapping?,
               locked, sort_order, sub_fields?: PlanSubField[] }
PlanSection  { id, name, description?, render_as: "tab"|"block",
               repeatable, repeat_label?, locked, sort_order, fields: PlanField[] }
PlanSchema   { sections: PlanSection[] }
OptionSet    { id, org_id, name, options: { value, label }[] }
```
Helpers: `newField`, `newSection`, `newSubField`, `defaultSchemaForTemplate(templateId)` (seeds sections/fields from existing `OUTPUT_FIELD_NAMES` per template — keeps current agents non-empty).

### 2. Mock data (`src/data/mock.ts`)
- Add `plan_schema: PlanSchema` to `Agent` and `AgentTemplate`. Seed via `defaultSchemaForTemplate`. Keep `output_fields` for back-compat (unused by new builder).
- Add `field_values: Record<string, unknown>` and `field_overrides?: PlanField[]` to `Plan` (optional, default `{}`).
- Convert `AVAILABLE_ROLES` and `AVAILABLE_LINKS` from `const` arrays to **mutable org libraries** (`rolesLibrary`, `icmLinksLibrary`).
- Add seed `optionSets`: Visit Type, Visit Frequency, POMS Categories, Goal Class.
- For agents linked to a guideline with `required_fields`, mark the matching fields/sections `locked: true` at seed time.

### 3. Adapter (`src/integrations/icm/index.ts`)
CRUD for: `listRoles/addRole/removeRole`, `listIcmLinks/addIcmLink/removeIcmLink`, `listOptionSets/getOptionSet/upsertOptionSet/deleteOptionSet`, `updateAgentSchema(agentId, schema)`.

### 4. Builder UI — new "Plan structure" mode
New folder `src/components/agents/builder/schema/`:
- `BuilderModeTabs.tsx` — toggle between **Workflow** (existing canvas) and **Plan structure** (new).
- `SchemaCanvas.tsx` — vertical list of sections with "Add section".
- `SectionCard.tsx` — header (name, render_as, repeatable, lock icon if locked), fields list, "Add field".
- `FieldRow.tsx` — compact row; click selects → opens config panel; lock icon disables delete.
- `FieldConfigPanel.tsx` — reuses existing right-side `ConfigPanel` styling; controls for label, type (fixed list), required, help_text, ai_instruction, option_set picker (when type needs one), caretracker_mapping (with yellow "Sends data to billing" warning, empty by default = "Document-only"), source_mapping.
- `SubFieldEditor.tsx` — inline editor for `repeater.sub_fields`.

Wire into `src/routes/agents.$id.edit.tsx`: add the mode tabs above the canvas; persist schema via `updateAgentSchema`. Locked items: lock icon, type+required+delete disabled, label/help editable.

### 5. Libraries settings page
New route `src/routes/settings.libraries.tsx` with three panels:
- `RolesLibrary.tsx`, `IcmLinksLibrary.tsx`, `OptionSetsLibrary.tsx` — simple list + add/remove (no HTML form tags, button onClick only).

Entry points: link from `AppShell` user menu and from the Guidelines page header.

Update `ConfigPanel.tsx` (existing task config) to read roles from `rolesLibrary` instead of the const.

## Phase 2 — Generation + manual editor (defer unless you want it now)

- `build-agent.functions.ts` + `generate-plan` consume `plan_schema`, fill `field_values`, build CareTracker payload only from fields with `caretracker_mapping`.
- `ManualEditor.tsx` rewritten to render from schema (one widget per field type, repeater = add/remove rows).
- `PlanPreview.tsx` reads `field_values` + schema.

This is non-trivial (especially `repeater` + `document_list` + `signature` widgets) and would roughly double the diff. The Phase 1 builder is usable on its own — schemas can be authored before generation consumes them.

## What I will NOT touch
Hexagon, AddPlanPicker, manual-or-AI modal, plan runtime/task assignments, guidelines library internals, AI assist, auth/localStorage. No HTML form tags. All components modular per folder above.

## Decision needed
1. **Phase 1 only**, or **Phase 1 + Phase 2** in one pass?
2. For Phase 2, OK if `repeater`, `document_list`, and `signature` get **minimal but functional** widgets (text-row repeater, filename list, name+role+timestamp button) rather than polished ones?
