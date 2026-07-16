-- New content modules: differentiation section, gallery, lead form toggle
alter table businesses add column if not exists differentiation jsonb;
alter table businesses add column if not exists gallery_images jsonb;
alter table businesses add column if not exists lead_form_enabled boolean not null default false;
