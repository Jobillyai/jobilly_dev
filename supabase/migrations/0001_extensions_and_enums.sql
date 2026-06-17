-- Migration 0001: Extensions and enums
-- Enables pgvector for RAG embeddings and defines shared enum types used
-- across the schema.

create extension if not exists vector;
create extension if not exists pgcrypto; -- gen_random_uuid()

create type user_role as enum (
  'subscribed_candidate',
  'free_candidate',
  'employee',
  'admin',
  'institution_admin',
  'institution_candidate'
);

create type subscription_status as enum (
  'none',
  'active',
  'past_due',
  'cancelled'
);

create type session_status as enum (
  'scheduled',
  'completed',
  'cancelled',
  'no_show'
);

create type application_status as enum (
  'queued',
  'applied',
  'interviewing',
  'rejected',
  'offer',
  'withdrawn'
);
