import { SWRConfiguration } from "swr";

export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 2000, // 2초 내 동일한 요청은 중복 제거
  focusThrottleInterval: 5000, // 포커스 시 5초마다 한 번만 재검증
  errorRetryCount: 3,
  errorRetryInterval: 5000,
};

