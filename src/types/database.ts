export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      brands: {
        Row: {
          id: string;
          name: string;
        };
        Insert: {
          id?: string;
          name: string;
        };
        Update: {
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
        };
        Insert: {
          id?: string;
          name: string;
        };
        Update: {
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      inventory: {
        Row: {
          id: string;
          product_option_id: string | null;
          quantity: number | null;
          updated_at: string | null;
          warehouse_id: string | null;
          weight_in_grams: number | null;
        };
        Insert: {
          id?: string;
          product_option_id?: string | null;
          quantity?: number | null;
          updated_at?: string | null;
          warehouse_id?: string | null;
          weight_in_grams?: number | null;
        };
        Update: {
          id?: string;
          product_option_id?: string | null;
          quantity?: number | null;
          updated_at?: string | null;
          warehouse_id?: string | null;
          weight_in_grams?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_product_option_id_fkey";
            columns: ["product_option_id"];
            isOneToOne: false;
            referencedRelation: "product_option_inventory_view";
            referencedColumns: ["product_option_id"];
          },
          {
            foreignKeyName: "inventory_product_option_id_fkey";
            columns: ["product_option_id"];
            isOneToOne: false;
            referencedRelation: "product_options";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "product_option_inventory_view";
            referencedColumns: ["warehouse_id"];
          },
          {
            foreignKeyName: "inventory_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      product_options: {
        Row: {
          box_unit: number | null;
          created_at: string | null;
          id: string;
          product_id: string | null;
          sku: string | null;
          unit_label: string | null;
          updated_at: string | null;
          weight: number | null;
        };
        Insert: {
          box_unit?: number | null;
          created_at?: string | null;
          id?: string;
          product_id?: string | null;
          sku?: string | null;
          unit_label?: string | null;
          updated_at?: string | null;
          weight?: number | null;
        };
        Update: {
          box_unit?: number | null;
          created_at?: string | null;
          id?: string;
          product_id?: string | null;
          sku?: string | null;
          unit_label?: string | null;
          updated_at?: string | null;
          weight?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_options_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product_option_inventory_view";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "product_options_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          brand_id: string | null;
          category_id: string | null;
          created_at: string | null;
          id: string;
          image_url: string | null;
          name: string;
          origin: string | null;
          product_type: string | null;
          storage_type: string | null;
          updated_at: string | null;
        };
        Insert: {
          brand_id?: string | null;
          category_id?: string | null;
          created_at?: string | null;
          id?: string;
          image_url?: string | null;
          name: string;
          origin?: string | null;
          product_type?: string | null;
          storage_type?: string | null;
          updated_at?: string | null;
        };
        Update: {
          brand_id?: string | null;
          category_id?: string | null;
          created_at?: string | null;
          id?: string;
          image_url?: string | null;
          name?: string;
          origin?: string | null;
          product_type?: string | null;
          storage_type?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string | null;
          email: string | null;
          id: string;
          image_url: string | null;
          name: string | null;
        };
        Insert: {
          created_at?: string | null;
          email?: string | null;
          id: string;
          image_url?: string | null;
          name?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string | null;
          id?: string;
          image_url?: string | null;
          name?: string | null;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth_key: string;
          created_at: string | null;
          device_id: string | null;
          device_name: string | null;
          endpoint: string;
          id: string;
          p256dh_key: string;
          platform: string | null;
          updated_at: string | null;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          auth_key: string;
          created_at?: string | null;
          device_id?: string | null;
          device_name?: string | null;
          endpoint: string;
          id?: string;
          p256dh_key: string;
          platform?: string | null;
          updated_at?: string | null;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          auth_key?: string;
          created_at?: string | null;
          device_id?: string | null;
          device_name?: string | null;
          endpoint?: string;
          id?: string;
          p256dh_key?: string;
          platform?: string | null;
          updated_at?: string | null;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      suppliers: {
        Row: {
          address: string | null;
          contact: string | null;
          created_at: string | null;
          id: string;
          name: string | null;
        };
        Insert: {
          address?: string | null;
          contact?: string | null;
          created_at?: string | null;
          id?: string;
          name?: string | null;
        };
        Update: {
          address?: string | null;
          contact?: string | null;
          created_at?: string | null;
          id?: string;
          name?: string | null;
        };
        Relationships: [];
      };
      transaction_items: {
        Row: {
          id: string;
          product_option_id: string | null;
          quantity: number | null;
          transaction_id: string | null;
        };
        Insert: {
          id?: string;
          product_option_id?: string | null;
          quantity?: number | null;
          transaction_id?: string | null;
        };
        Update: {
          id?: string;
          product_option_id?: string | null;
          quantity?: number | null;
          transaction_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "transaction_items_product_option_id_fkey";
            columns: ["product_option_id"];
            isOneToOne: false;
            referencedRelation: "product_option_inventory_view";
            referencedColumns: ["product_option_id"];
          },
          {
            foreignKeyName: "transaction_items_product_option_id_fkey";
            columns: ["product_option_id"];
            isOneToOne: false;
            referencedRelation: "product_options";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_items_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transaction_history_view";
            referencedColumns: ["transaction_id"];
          },
          {
            foreignKeyName: "transaction_items_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          created_at: string | null;
          from_warehouse_id: string | null;
          id: string;
          memo: string | null;
          supplier_id: string | null;
          to_warehouse_id: string | null;
          type: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          from_warehouse_id?: string | null;
          id?: string;
          memo?: string | null;
          supplier_id?: string | null;
          to_warehouse_id?: string | null;
          type?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          from_warehouse_id?: string | null;
          id?: string;
          memo?: string | null;
          supplier_id?: string | null;
          to_warehouse_id?: string | null;
          type?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_from_warehouse_id_fkey";
            columns: ["from_warehouse_id"];
            isOneToOne: false;
            referencedRelation: "product_option_inventory_view";
            referencedColumns: ["warehouse_id"];
          },
          {
            foreignKeyName: "transactions_from_warehouse_id_fkey";
            columns: ["from_warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_to_warehouse_id_fkey";
            columns: ["to_warehouse_id"];
            isOneToOne: false;
            referencedRelation: "product_option_inventory_view";
            referencedColumns: ["warehouse_id"];
          },
          {
            foreignKeyName: "transactions_to_warehouse_id_fkey";
            columns: ["to_warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      user_activity_read: {
        Row: {
          id: string;
          user_id: string;
          transaction_id: string;
          product_option_id: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          transaction_id: string;
          product_option_id: string;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_id?: string;
          product_option_id?: string;
          read_at?: string | null;
        };
        Relationships: [];
      };
      user_read_status: {
        Row: {
          id: string;
          last_read_broadcast_id: number;
          read_at: string | null;
          user_id: string;
        };
        Insert: {
          id?: string;
          last_read_broadcast_id?: number;
          read_at?: string | null;
          user_id: string;
        };
        Update: {
          id?: string;
          last_read_broadcast_id?: number;
          read_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      warehouses: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      product_option_inventory_view: {
        Row: {
          box_unit: number | null;
          brand_name: string | null;
          category_name: string | null;
          image_url: string | null;
          inventory_id: string | null;
          origin: string | null;
          product_id: string | null;
          product_name: string | null;
          product_option_id: string | null;
          product_type: string | null;
          quantity: number | null;
          sku: string | null;
          storage_type: string | null;
          unit_label: string | null;
          warehouse_id: string | null;
          warehouse_name: string | null;
          weight: number | null;
          weight_in_grams: number | null;
        };
        Relationships: [];
      };
      transaction_history_view: {
        Row: {
          created_at: string | null;
          from_warehouse_name: string | null;
          memo: string | null;
          product_name: string | null;
          product_option_id: string | null;
          quantity: number | null;
          supplier_name: string | null;
          to_warehouse_name: string | null;
          transaction_id: string | null;
          type: string | null;
          unit_label: string | null;
          user_image_url: string | null;
          user_name: string | null;
          weight: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "transaction_items_product_option_id_fkey";
            columns: ["product_option_id"];
            isOneToOne: false;
            referencedRelation: "product_option_inventory_view";
            referencedColumns: ["product_option_id"];
          },
          {
            foreignKeyName: "transaction_items_product_option_id_fkey";
            columns: ["product_option_id"];
            isOneToOne: false;
            referencedRelation: "product_options";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      create_transaction: {
        Args: { p_header: Record<string, unknown>; p_items: Record<string, unknown>[] };
        Returns: { transaction_id: string; success: boolean };
      };
      create_move_transaction: {
        Args: { p_header: Record<string, unknown>; p_items: Record<string, unknown>[] };
        Returns: { transaction_id: string; success: boolean };
      };
      create_adjustment_transaction: {
        Args: { p_header: Record<string, unknown>; p_items: Record<string, unknown>[] };
        Returns: { transaction_id: string; success: boolean };
      };
      get_inventory_history: {
        Args: Record<string, never>;
        Returns: unknown[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;

// 커스텀 타입들

// 테이블 Row 타입들
export type ProductOption = Database["public"]["Tables"]["product_options"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Brand = Database["public"]["Tables"]["brands"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Warehouse = Database["public"]["Tables"]["warehouses"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Inventory = Database["public"]["Tables"]["inventory"]["Row"];
export type UserInfo = Profile; // alias

// TransactionHistoryView: transaction_history_view 뷰 Row 타입
export type TransactionHistoryView = Database["public"]["Views"]["transaction_history_view"]["Row"];

// InventoryTransaction: 재고 변동 내역 타입 (TransactionHistoryView 확장)
export type InventoryTransaction = TransactionHistoryView;

// ProductOptionView: product_option_inventory_view에 quantity 필드 추가 및 필수 필드 non-null 처리
type ProductOptionInventoryViewRow = Database["public"]["Views"]["product_option_inventory_view"]["Row"];

export type ProductOptionView = Omit<
  ProductOptionInventoryViewRow,
  "product_option_id" | "product_id" | "product_name" | "weight" | "unit_label"
> & {
  product_option_id: string;
  product_id: string;
  product_name: string;
  weight: number;
  unit_label: string;
  quantity: number; // 선택된 수량 (완제품: 개수, 원재료: g 단위 중량)
};
