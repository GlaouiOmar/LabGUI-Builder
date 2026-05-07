# Architecture Document Plan — Lab GUI Builder (Webapp)

## Context
User wants a detailed technical and functional architecture for a web-based GUI builder tool for lab environments. Desktop app is deferred. Focus on webapp solution.

## Deliverable
A comprehensive architecture document (.md) covering:
- Functional Architecture (features, user flows, UI/UX)
- Technical Architecture (stack, components, data flow)
- IR Schema (detailed JSON schema)
- Component Architecture (frontend modules, canvas, editors)
- Widget Catalog (all widgets with properties)
- Lab Features (instrument binding, state, logging, alarms)
- Code Generation Pipeline (tkinter export)
- Preview System (wireframe + Run Preview)
- Data Persistence (save/load, templates, versioning)

## Stages

### Stage 1 — Parallel Architecture Sections (4 sub-agents)
- Functional_Architect: User flows, feature matrix, UI layout, wireframes description
- Technical_Architect: Tech stack, component diagram, data flow, state management
- IR_CodeGen_Architect: IR schema, code generator design, export pipeline
- Lab_Architect: Instrument binding, state inspector, data logging, alarms, lab templates

### Stage 2 — Synthesis
- Merge all sections into a single cohesive architecture document
- Ensure consistency across sections
- Add executive summary and decision log
