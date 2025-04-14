// 렌더링 관련
import { render, screen } from "@testing-library/react";

function InventoryList({ items }: { items: { name: string }[] }) {
  if (items.length === 0) return <p>등록된 제품이 없습니다</p>;
  return (
    <ul>
      {items.map((i) => (
        <li key={i.name}>{i.name}</li>
      ))}
    </ul>
  );
}

describe("InventoryList", () => {
  it("빈 배열일 때 안내 메시지를 보여줌", () => {
    render(<InventoryList items={[]} />);
    expect(screen.getByText("등록된 제품이 없습니다")).toBeInTheDocument();
  });

  it("제품 리스트가 렌더링 됨", () => {
    render(<InventoryList items={[{ name: "냉동만두" }]} />);
    expect(screen.getByText("냉동만두")).toBeInTheDocument();
  });
});
