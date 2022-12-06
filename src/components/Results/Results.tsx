import { useCallback, useEffect, useMemo } from "react";
import {
  Button,
  Checkbox,
  Frame,
  ScrollView,
  Select,
  Separator,
} from "react95";
import styled from "styled-components";

import { useCsvExporter } from "../../hooks/useCsvExporter";
import { useResults } from "../../hooks/useResults";
import { useSearchParamsState } from "../../hooks/useSearchParamsState";
import { useSet } from "../../hooks/useSet";
import { useWindowManager } from "../../hooks/useWindowManager";
import type { AccountWithTwitter } from "../../types";
import { getAccountInstanceUri } from "../../utils/fediverse";
import {
  Toolbar,
  ToolbarButtonIcon,
  ToolbarDivider,
  ToolbarHandle,
  ToolbarIcon,
  ToolbarLabel,
} from "../Toolbar";
import { Window } from "../WindowManager/Window";
import { ResultPerson } from "./ResultPerson";

const sortOptions = [
  {
    label: "Status",
    value: "followStatus",
    sort: (accountLeft: AccountWithTwitter, accountRight: AccountWithTwitter) =>
      accountLeft.following && !accountRight.following
        ? 1
        : !accountLeft.following && accountRight.following
        ? -1
        : accountLeft.name.localeCompare(accountRight.name),
  },
  {
    label: "Name",
    value: "name",
    sort: (accountLeft: AccountWithTwitter, accountRight: AccountWithTwitter) =>
      accountLeft.name.localeCompare(accountRight.name),
  },
  {
    label: "Followers",
    value: "followers",
    sort: (accountLeft: AccountWithTwitter, accountRight: AccountWithTwitter) =>
      (accountRight.followersCount ?? 0) - (accountLeft.followersCount ?? 0),
  },
  {
    label: "Following",
    value: "following",
    sort: (accountLeft: AccountWithTwitter, accountRight: AccountWithTwitter) =>
      (accountRight.followingCount ?? 0) - (accountLeft.followingCount ?? 0),
  },
  {
    label: "Instance",
    value: "instance",
    sort: (accountLeft: AccountWithTwitter, accountRight: AccountWithTwitter) =>
      getAccountInstanceUri(accountLeft.account)?.localeCompare(
        getAccountInstanceUri(accountRight.account) ?? "",
      ) ?? 0,
  },
  {
    label: "Activity",
    value: "activity",
    sort: (accountLeft: AccountWithTwitter, accountRight: AccountWithTwitter) =>
      (accountRight.lastStatusAt ? Date.parse(accountRight.lastStatusAt) : 0) -
      (accountLeft.lastStatusAt ? Date.parse(accountLeft.lastStatusAt) : 0),
  },
];

const ScrollViewStyled = styled(ScrollView)`
  position: relative;
  overflow: hidden;
  background: #fff;
  width: 100%;
  height: 100%;

  & > div {
    padding: 0;
  }
`;

const PeopleListHeader = styled.div<{ method: string | undefined }>`
  position: sticky;
  top: 0;
  display: grid;
  z-index: 2;

  @media (max-width: 767px) {
    grid-template: ${({ method }) =>
      method === "typical"
        ? `"Checkbox Account Account" auto / 40px 68px 1fr`
        : `"Account Account" auto / 68px 1fr`};
  }

  @media (min-width: 768px) {
    grid-template: ${({ method }) =>
      method === "typical"
        ? `"Checkbox Account Account Details Actions" auto / 40px 68px 2fr 2fr 1fr`
        : `"Account Account Actions" auto / 68px 2fr 1fr`};
  }
`;

const PeopleListHeaderCell = styled(Frame).attrs({
  variant: "button",
})`
  padding: 6px 8px;
`;

const PeopleListHeaderCheckbox = styled(PeopleListHeaderCell)`
  grid-area: Checkbox;
  padding-block: 0;
`;

const PeopleListHeaderAccount = styled(PeopleListHeaderCell)`
  grid-area: Account;
`;

const PeopleListHeaderDetails = styled(PeopleListHeaderCell)`
  grid-area: Details;

  @media (max-width: 767px) {
    display: none;
  }
`;

const PeopleListHeaderActions = styled(PeopleListHeaderCell)`
  grid-area: Actions;

  @media (max-width: 767px) {
    display: none;
  }
`;

const PeopleCheckbox = styled(Checkbox)`
  display: block;
  margin: 8px 0;

  & > div {
    margin: 0;
  }
`;

const PeopleList = styled.ul`
  z-index: 1;
`;

const StatusBar = styled(Frame).attrs({
  variant: "well",
})`
  height: calc(calc(1em * 1.5) + 10px);
  padding: 4px 6px;
  width: 100%;
  margin-block-start: 4px;

  @media print {
    & {
      display: none;
    }
  }
`;

export function Results() {
  const { registerSelf, windowMeta } = useWindowManager();

  useEffect(() => {
    registerSelf();
  }, [registerSelf]);

  const { followUnfollow, loadingAccountIds, loadResults, method, results } =
    useResults();

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const twitterUserMap = useMemo(() => {
    return new Map(
      results?.twitterUsers.map((twitterUser) => [
        twitterUser.username,
        twitterUser,
      ]),
    );
  }, [results?.twitterUsers]);

  const selectedAccountIds = useSet<string>();

  const handleClose = useCallback(() => {
    location.href = "/desktop";
  }, []);

  const handleToggleAccountId = useCallback(
    (accountId: string, value: boolean) => {
      selectedAccountIds[value ? "add" : "delete"](accountId);
    },
    [selectedAccountIds],
  );

  const handleSelectAll = useCallback(() => {
    const operation =
      results?.accounts.length !== selectedAccountIds.size ? "add" : "delete";
    results?.accounts.forEach((account) => {
      selectedAccountIds[operation](account.id);
    });
  }, [results?.accounts, selectedAccountIds]);

  const [sortValue = "followStatus", setSortValue] =
    useSearchParamsState("sortBy");
  const sortedAccounts = useMemo(() => {
    const sortOption =
      sortOptions.find((sortOption) => sortOption.value === sortValue) ??
      sortOptions[0];
    return results?.accounts.sort(sortOption?.sort) ?? [];
  }, [results?.accounts, sortValue]);

  const handleSortChange = useCallback(
    (option: { value: string }) => {
      setSortValue(option.value);
    },
    [setSortValue],
  );

  const downloadCsv = useCsvExporter();
  const handleExportCsv = useCallback(() => {
    if (
      selectedAccountIds.size === sortedAccounts.length ||
      !selectedAccountIds.size
    ) {
      downloadCsv(sortedAccounts);
      return;
    }

    downloadCsv(
      sortedAccounts.filter((account) => selectedAccountIds.has(account.id)),
    );
  }, [downloadCsv, selectedAccountIds, sortedAccounts]);

  const followUnfollowSelected = useCallback(
    async (operation: "follow" | "unfollow") => {
      for (const account of sortedAccounts) {
        if (
          !selectedAccountIds.has(account.id) ||
          (operation === "follow" && account.following) ||
          (operation === "unfollow" && !account.following)
        ) {
          continue;
        }
        await followUnfollow(account.id, operation);
      }
    },
    [followUnfollow, selectedAccountIds, sortedAccounts],
  );

  const handleFollowSelected = useCallback(() => {
    followUnfollowSelected("follow");
  }, [followUnfollowSelected]);

  const handleUnfollowSelected = useCallback(() => {
    followUnfollowSelected("unfollow");
  }, [followUnfollowSelected]);

  const status = useMemo(
    () =>
      `${results?.accounts.length} account${
        results?.accounts.length === 1 ? "" : "s"
      }${
        selectedAccountIds.size ? `, ${selectedAccountIds.size} selected` : ""
      }`,
    [results?.accounts.length, selectedAccountIds.size],
  );

  const isLoading = loadingAccountIds.size > 0;

  if (!results) {
    return null;
  }

  return (
    <Window
      icon="toolbarMastodon"
      noPadding={true}
      onClose={handleClose}
      size="large"
      title="Mastodon Flock"
      windowMeta={windowMeta}
    >
      <Toolbar>
        <ToolbarHandle />
        <Button variant="thin" size="sm">
          File
        </Button>
        <Button variant="thin" size="sm">
          Edit
        </Button>
        <Button variant="thin" size="sm">
          View
        </Button>
        <Button variant="thin" size="sm">
          Help
        </Button>
      </Toolbar>
      {method === "typical" ? (
        <>
          <ToolbarDivider />
          <Toolbar>
            <ToolbarHandle />
            <ToolbarButtonIcon
              icon="toolbarFollow"
              disabled={!selectedAccountIds.size || isLoading}
              onClick={handleFollowSelected}
              title="Follow Selected Accounts"
            />

            <ToolbarButtonIcon
              icon="toolbarUnfollow"
              disabled={!selectedAccountIds.size || isLoading}
              onClick={handleUnfollowSelected}
              title="Unfollow Selected Accounts"
            />

            <ToolbarHandle />
            <ToolbarIcon icon="toolbarSort" title="Sort" />
            <ToolbarLabel>
              <Select
                id="sortOptions"
                options={sortOptions}
                value={sortValue}
                onChange={handleSortChange}
              />
            </ToolbarLabel>
            <Separator orientation="vertical" size="auto" />
            <ToolbarButtonIcon
              icon="toolbarExportMastodon"
              onClick={handleExportCsv}
              title="Download Mastodon CSV File"
            />
          </Toolbar>
        </>
      ) : undefined}
      <ScrollViewStyled shadow={false}>
        <PeopleListHeader method={method}>
          {method === "typical" ? (
            <PeopleListHeaderCheckbox>
              <PeopleCheckbox
                checked={selectedAccountIds.size === sortedAccounts.length}
                indeterminate={Boolean(
                  selectedAccountIds.size &&
                    selectedAccountIds.size < sortedAccounts.length,
                )}
                onClick={handleSelectAll}
              />
            </PeopleListHeaderCheckbox>
          ) : undefined}

          <PeopleListHeaderAccount>Account</PeopleListHeaderAccount>
          {method === "typical" ? (
            <PeopleListHeaderDetails>Details</PeopleListHeaderDetails>
          ) : undefined}
          <PeopleListHeaderActions>Actions</PeopleListHeaderActions>
        </PeopleListHeader>
        <PeopleList>
          {sortedAccounts.map((account) => (
            <ResultPerson
              key={account.id}
              account={account}
              followUnfollow={followUnfollow}
              method={method}
              loading={loadingAccountIds.has(account.id)}
              onToggle={handleToggleAccountId}
              selected={selectedAccountIds.has(account.id)}
              twitterUsers={twitterUserMap}
            />
          ))}
        </PeopleList>
      </ScrollViewStyled>
      <StatusBar>{status}</StatusBar>
    </Window>
  );
}
