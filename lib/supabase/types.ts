export type DocumentType = "quote" | "invoice" | "credit_note";

export type DocumentStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "declined"
  | "paid"
  | "issued"
  | "void";

export type PaymentMethod = "eft" | "cash" | "card" | "other";
export type ContractStatus = "draft" | "active" | "paused" | "ended";
export type BillingCadence = "monthly" | "quarterly" | "yearly";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      company_settings: {
        Row: {
          id: string;
          company_name: string;
          contact_name: string;
          email: string;
          phone: string;
          address: string;
          website: string;
          vat_number: string;
          registration_number: string;
          bank_name: string;
          bank_account_name: string;
          bank_account_number: string;
          bank_branch_code: string;
          default_payment_terms_days: number;
          default_quote_validity_days: number;
          invoice_prefix: string;
          quote_prefix: string;
          credit_note_prefix: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_name?: string;
          contact_name?: string;
          email?: string;
          phone?: string;
          address?: string;
          website?: string;
          vat_number?: string;
          registration_number?: string;
          bank_name?: string;
          bank_account_name?: string;
          bank_account_number?: string;
          bank_branch_code?: string;
          default_payment_terms_days?: number;
          default_quote_validity_days?: number;
          invoice_prefix?: string;
          quote_prefix?: string;
          credit_note_prefix?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_name?: string;
          contact_name?: string;
          email?: string;
          phone?: string;
          address?: string;
          website?: string;
          vat_number?: string;
          registration_number?: string;
          bank_name?: string;
          bank_account_name?: string;
          bank_account_number?: string;
          bank_branch_code?: string;
          default_payment_terms_days?: number;
          default_quote_validity_days?: number;
          invoice_prefix?: string;
          quote_prefix?: string;
          credit_note_prefix?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      document_sequences: {
        Row: {
          doc_type: DocumentType;
          year: number;
          last_number: number;
        };
        Insert: {
          doc_type: DocumentType;
          year: number;
          last_number?: number;
        };
        Update: {
          doc_type?: DocumentType;
          year?: number;
          last_number?: number;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          name: string;
          business_name: string;
          email: string;
          phone: string;
          address: string;
          vat_number: string;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          business_name?: string;
          email?: string;
          phone?: string;
          address?: string;
          vat_number?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          business_name?: string;
          email?: string;
          phone?: string;
          address?: string;
          vat_number?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contracts: {
        Row: {
          id: string;
          client_id: string;
          title: string;
          status: ContractStatus;
          cadence: BillingCadence;
          start_date: string;
          end_date: string | null;
          next_bill_on: string | null;
          auto_send: boolean;
          payment_terms_days: number | null;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          title: string;
          status?: ContractStatus;
          cadence?: BillingCadence;
          start_date?: string;
          end_date?: string | null;
          next_bill_on?: string | null;
          auto_send?: boolean;
          payment_terms_days?: number | null;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          title?: string;
          status?: ContractStatus;
          cadence?: BillingCadence;
          start_date?: string;
          end_date?: string | null;
          next_bill_on?: string | null;
          auto_send?: boolean;
          payment_terms_days?: number | null;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      contract_lines: {
        Row: {
          id: string;
          contract_id: string;
          description: string;
          qty: number;
          unit_price: number;
          sort_order: number;
        };
        Insert: {
          id?: string;
          contract_id: string;
          description: string;
          qty?: number;
          unit_price?: number;
          sort_order?: number;
        };
        Update: {
          id?: string;
          contract_id?: string;
          description?: string;
          qty?: number;
          unit_price?: number;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "contract_lines_contract_id_fkey";
            columns: ["contract_id"];
            isOneToOne: false;
            referencedRelation: "contracts";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          client_id: string;
          document_id: string | null;
          amount: number;
          paid_at: string;
          method: PaymentMethod;
          reference: string;
          notes: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          document_id?: string | null;
          amount: number;
          paid_at?: string;
          method?: PaymentMethod;
          reference?: string;
          notes?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          document_id?: string | null;
          amount?: number;
          paid_at?: string;
          method?: PaymentMethod;
          reference?: string;
          notes?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_sends: {
        Row: {
          id: string;
          document_id: string;
          client_id: string;
          to_email: string;
          status: "sent" | "failed";
          provider_message_id: string;
          error: string;
          sent_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          client_id: string;
          to_email: string;
          status: "sent" | "failed";
          provider_message_id?: string;
          error?: string;
          sent_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          client_id?: string;
          to_email?: string;
          status?: "sent" | "failed";
          provider_message_id?: string;
          error?: string;
          sent_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_sends_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_sends_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          id: string;
          type: DocumentType;
          number: string;
          status: DocumentStatus;
          client_id: string;
          issue_date: string;
          due_or_valid_until: string | null;
          subtotal: number;
          vat_total: number;
          total: number;
          notes: string;
          source_quote_id: string | null;
          contract_id: string | null;
          public_token: string | null;
          billing_period_start: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type: DocumentType;
          number: string;
          status?: DocumentStatus;
          client_id: string;
          issue_date?: string;
          due_or_valid_until?: string | null;
          subtotal?: number;
          vat_total?: number;
          total?: number;
          notes?: string;
          source_quote_id?: string | null;
          contract_id?: string | null;
          public_token?: string | null;
          billing_period_start?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: DocumentType;
          number?: string;
          status?: DocumentStatus;
          client_id?: string;
          issue_date?: string;
          due_or_valid_until?: string | null;
          subtotal?: number;
          vat_total?: number;
          total?: number;
          notes?: string;
          source_quote_id?: string | null;
          contract_id?: string | null;
          public_token?: string | null;
          billing_period_start?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_source_quote_id_fkey";
            columns: ["source_quote_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_contract_id_fkey";
            columns: ["contract_id"];
            isOneToOne: false;
            referencedRelation: "contracts";
            referencedColumns: ["id"];
          },
        ];
      };
      document_lines: {
        Row: {
          id: string;
          document_id: string;
          description: string;
          qty: number;
          unit_price: number;
          vat_rate: number;
          sort_order: number;
          done_date: string | null;
        };
        Insert: {
          id?: string;
          document_id: string;
          description: string;
          qty?: number;
          unit_price?: number;
          vat_rate?: number;
          sort_order?: number;
          done_date?: string | null;
        };
        Update: {
          id?: string;
          document_id?: string;
          description?: string;
          qty?: number;
          unit_price?: number;
          vat_rate?: number;
          sort_order?: number;
          done_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "document_lines_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      catalog_items: {
        Row: {
          id: string;
          name: string;
          unit_price: number;
          active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          unit_price?: number;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          unit_price?: number;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      next_document_number: {
        Args: { p_type: DocumentType; p_year?: number };
        Returns: string;
      };
    };
    Enums: {
      document_type: DocumentType;
      document_status: DocumentStatus;
      payment_method: PaymentMethod;
      contract_status: ContractStatus;
      billing_cadence: BillingCadence;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type CompanySettings =
  Database["public"]["Tables"]["company_settings"]["Row"];
export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type DocumentLine = Database["public"]["Tables"]["document_lines"]["Row"];
export type CatalogItem = Database["public"]["Tables"]["catalog_items"]["Row"];
export type Contract = Database["public"]["Tables"]["contracts"]["Row"];
export type ContractLine = Database["public"]["Tables"]["contract_lines"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type InvoiceSend = Database["public"]["Tables"]["invoice_sends"]["Row"];

export type DocumentWithRelations = Document & {
  clients: Client | null;
  document_lines: DocumentLine[];
};

export type ContractWithRelations = Contract & {
  clients: Client | null;
  contract_lines: ContractLine[];
};
