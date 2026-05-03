"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";

export function TopNavLink({
  locale,
  friendsLabel,
  backHomeLabel,
  showFriendLinks,
}: {
  locale: string;
  friendsLabel: string;
  backHomeLabel: string;
  showFriendLinks: boolean;
}) {
  const pathname = usePathname() ?? "";
  const friendsPrefix = `/${locale}/friends`;
  const onFriendsPage =
    pathname === friendsPrefix || pathname.startsWith(`${friendsPrefix}/`);

  // When the user is already on /friends, always offer a way back to the
  // homepage — even if the admin has disabled the friend-links entry.
  if (!onFriendsPage && !showFriendLinks) {
    return null;
  }

  const href = onFriendsPage ? `/${locale}` : `/${locale}/friends`;
  const label = onFriendsPage ? backHomeLabel : friendsLabel;

  return (
    <NextLink
      href={href}
      className="glass-panel inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-medium text-foreground transition-transform hover:scale-105"
    >
      {label}
    </NextLink>
  );
}
