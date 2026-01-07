"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import type * as React from "react";
import { cn } from "@/lib/utils";

export interface TabProps extends React.ComponentProps<typeof TabsPrimitive.Root> {
  /**
   * 탭 아이템들
   */
  items: Array<{
    value: string;
    label: string;
    content?: React.ReactNode;
  }>;
  /**
   * 기본 선택된 탭 값
   */
  defaultValue?: string;
  /**
   * 선택된 탭 값 (controlled)
   */
  value?: string;
  /**
   * 탭 변경 핸들러
   */
  onValueChange?: (value: string) => void;
  /**
   * 탭 크기
   */
  size?: "sm" | "md";
}

/**
 * Tab2 컴포넌트
 * Figma 디자인 기반: 하단 테두리 스타일 탭
 *
 * @example
 * ```tsx
 * <Tab2
 *   items={[
 *     { value: "tab1", label: "Text1", content: "contents1" },
 *     { value: "tab2", label: "Text2", content: "contents2" },
 *   ]}
 *   defaultValue="tab1"
 *   size="sm"
 * />
 * ```
 */
export default function Tab({ items = [], defaultValue, value, onValueChange, size = "sm", className, ...props }: TabProps) {
  return (
    <TabsPrimitive.Root
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      className={cn("flex flex-col w-full", className)}
      {...props}
    >
      <TabsPrimitive.List
        data-slot="tab2-list"
        className={cn("flex w-full items-start justify-start border-0 bg-transparent p-0", size === "md" && "gap-[15px]")}
      >
        {items?.map((item) => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            data-slot="tab2-trigger"
            className={cn(
              "flex h-[40px] flex-1 flex-col items-center justify-center border-b-2 border-transparent transition-all",
              // 활성화 상태
              "data-[state=active]:border-black data-[state=active]:font-bold data-[state=active]:text-black",
              // 비활성화 상태
              "data-[state=inactive]:border-b data-[state=inactive]:border-[#e8ebf0] data-[state=inactive]:font-semibold data-[state=inactive]:text-[#a0a5ad]",
              // 크기별 스타일
              size === "sm" && "py-[9px] text-[15px] leading-[22px]",
              size === "md" && "py-0 text-[18px] leading-[24px]"
            )}
          >
            <span className="whitespace-nowrap">{item.label}</span>
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>

      {items?.map((item) => (
        <TabsPrimitive.Content key={item.value} value={item.value} data-slot="tab2-content" className="flex flex-col w-full outline-none">
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
