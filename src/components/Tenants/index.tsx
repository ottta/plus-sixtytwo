"use client";

import TenantItem from "./TenantItem";
import useSWRInfinite from "swr/infinite";

import { ResponseTenants } from "@/types/tenants";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { typedFetch } from "typed-route-handler/client";
import { useIntersectionObserver } from "usehooks-ts";

import { API_TENANTS, NEXT_PUBLIC_HOST, PAGE_SIZE } from "@/libs/constants";
import { cn } from "@/libs/utils";

function useScrolToTop() {
  const searchParams = useSearchParams();
  const freezeSearchParams = useRef(searchParams.toString());
  const ref = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (searchParams.toString() === freezeSearchParams.current) return;
    ref.current.scrollIntoView({ behavior: "smooth" });
    freezeSearchParams.current = searchParams.toString();
  }, [ref, searchParams, freezeSearchParams]);
  return ref;
}

function Skeleton({ length }: { length: number }) {
  return (
    <ul className={cn("flex", "flex-col", "gap-1")}>
      {Array.from({ length }).map((_, i) => (
        <li key={i} className={cn("h-12")} />
      ))}
    </ul>
  );
}

export default function Tenants({ init }: { init: ResponseTenants }) {
  const searchParams = useSearchParams();

  const getKey = (index: number, prevData: ResponseTenants) => {
    const endpoint = new URL(API_TENANTS, NEXT_PUBLIC_HOST);
    Array.from(searchParams.entries()).forEach((item) => {
      const [key, value] = item;
      if (searchParams.has(key)) {
        endpoint.searchParams.set(key, value);
      } else {
        endpoint.searchParams.append(key, value);
      }
    });

    if (prevData && !prevData.data) return null;
    if (index === 0) return endpoint.href;
    endpoint.searchParams.append(
      "cursor",
      prevData.data[prevData.data.length - 1].cursor.toString(),
    );
    return endpoint.href;
  };

  const { data, error, size, setSize, isValidating, isLoading } =
    useSWRInfinite<ResponseTenants>(getKey, typedFetch, {
      fallbackData: [init],
      keepPreviousData: true,
    });

  const tempData: ResponseTenants[] = [];
  const tenants = data ? tempData.concat(...data) : [];
  const isLoadingMore =
    isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");
  const isEmpty = data?.[0]?.data.length === 0;
  const isReachingEnd =
    isEmpty || (data && data[data.length - 1].data.length < PAGE_SIZE);

  const { ref, isIntersecting } = useIntersectionObserver();
  useEffect(() => {
    if (!isIntersecting) return;
    if (isLoadingMore || isReachingEnd) return;
    if (isValidating) return;
    setSize(size + 1);
  }, [
    isIntersecting,
    isValidating,
    size,
    setSize,
    isReachingEnd,
    isLoadingMore,
  ]);

  const refParent = useScrolToTop();

  if (error) return null;
  if (!data) return <Skeleton length={PAGE_SIZE} />;
  if (tenants.length <= 0) return <div>No Data</div>;

  return (
    <ul
      ref={refParent}
      className={cn(
        isLoading && "opacity-30",
        "gap-1",
        "scroll-mt-[calc(25svh+4rem)]",
        "lg:scroll-mt-28",
        "divide-y",
      )}
    >
      {data.map((item) =>
        item.data.map((item, i) => {
          const { cursor } = item;
          return <TenantItem key={i} index={cursor} {...item} />;
        }),
      )}
      <li>
        <button
          ref={ref}
          disabled={isLoadingMore || isReachingEnd}
          onClick={() => setSize(size + 1)}
          className={cn(
            "w-full",
            "h-14",
            "bg-neutral-100",
            "dark:bg-neutral-900",
            "capitalize",
            "disabled:opacity-30",
            "disabled:cursor-not-allowed",
          )}
        >
          {isLoadingMore
            ? "loading..."
            : isReachingEnd
              ? "no more result"
              : "load more"}
        </button>
      </li>
    </ul>
  );
}
