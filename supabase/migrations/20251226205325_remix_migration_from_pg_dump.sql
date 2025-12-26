CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'manager',
    'cashier',
    'viewer'
);


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: app_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    access_code text NOT NULL,
    role public.app_role DEFAULT 'cashier'::public.app_role NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_number text NOT NULL,
    name text NOT NULL,
    phone text,
    address text,
    email text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    product_id uuid,
    item_number text NOT NULL,
    item_name text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    min_price numeric(10,2) DEFAULT 0 NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    warehouse_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_number text NOT NULL,
    client_id uuid,
    invoice_date date DEFAULT CURRENT_DATE NOT NULL,
    payment_method text DEFAULT 'نقدي'::text NOT NULL,
    total_amount numeric(12,2) DEFAULT 0 NOT NULL,
    notes text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_number text NOT NULL,
    name text NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    min_price numeric(10,2) DEFAULT 0 NOT NULL,
    stock_quantity integer DEFAULT 0 NOT NULL,
    warehouse_id uuid,
    category text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    permission text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warehouses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: app_users app_users_access_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_access_code_key UNIQUE (access_code);


--
-- Name: app_users app_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_pkey PRIMARY KEY (id);


--
-- Name: clients clients_client_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_client_number_key UNIQUE (client_number);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: products products_item_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_item_number_key UNIQUE (item_number);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- Name: user_permissions user_permissions_user_id_permission_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_permission_key UNIQUE (user_id, permission);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);


--
-- Name: idx_app_users_access_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_users_access_code ON public.app_users USING btree (access_code);


--
-- Name: idx_app_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_users_role ON public.app_users USING btree (role);


--
-- Name: idx_clients_client_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_client_number ON public.clients USING btree (client_number);


--
-- Name: idx_clients_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_name ON public.clients USING btree (name);


--
-- Name: idx_invoice_items_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items USING btree (invoice_id);


--
-- Name: idx_invoices_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_date ON public.invoices USING btree (invoice_date);


--
-- Name: idx_invoices_invoice_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_invoice_number ON public.invoices USING btree (invoice_number);


--
-- Name: idx_products_item_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_item_number ON public.products USING btree (item_number);


--
-- Name: idx_products_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_name ON public.products USING btree (name);


--
-- Name: app_users update_app_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_app_users_updated_at BEFORE UPDATE ON public.app_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: clients update_clients_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoices update_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: warehouses update_warehouses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoice_items invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoice_items invoice_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: invoice_items invoice_items_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: invoices invoices_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: products products_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: user_permissions user_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;


--
-- Name: clients Allow all access to clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to clients" ON public.clients USING (true) WITH CHECK (true);


--
-- Name: invoice_items Allow all access to invoice_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to invoice_items" ON public.invoice_items USING (true) WITH CHECK (true);


--
-- Name: invoices Allow all access to invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to invoices" ON public.invoices USING (true) WITH CHECK (true);


--
-- Name: products Allow all access to products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to products" ON public.products USING (true) WITH CHECK (true);


--
-- Name: warehouses Allow all access to warehouses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to warehouses" ON public.warehouses USING (true) WITH CHECK (true);


--
-- Name: app_users Allow public delete on app_users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete on app_users" ON public.app_users FOR DELETE USING (true);


--
-- Name: user_permissions Allow public delete on user_permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete on user_permissions" ON public.user_permissions FOR DELETE USING (true);


--
-- Name: app_users Allow public insert on app_users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert on app_users" ON public.app_users FOR INSERT WITH CHECK (true);


--
-- Name: user_permissions Allow public insert on user_permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert on user_permissions" ON public.user_permissions FOR INSERT WITH CHECK (true);


--
-- Name: app_users Allow public read on app_users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on app_users" ON public.app_users FOR SELECT USING (true);


--
-- Name: user_permissions Allow public read on user_permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on user_permissions" ON public.user_permissions FOR SELECT USING (true);


--
-- Name: app_users Allow public update on app_users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update on app_users" ON public.app_users FOR UPDATE USING (true);


--
-- Name: app_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

--
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

--
-- Name: invoice_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: user_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: warehouses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;