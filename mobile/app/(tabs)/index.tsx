// Home — centered one-screen landing over a fixed line-art backdrop.
// Renders: welcome (+inline streak), headline, search + scope row, quick
// actions, trending chips, StatsRow (real counts only), exam cards (if any),
// "Pick up where you left off" (if any). Convex queries are live.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, StyleSheet, Text, View } from 'react-native';
import HapticPressable from '@/components/HapticPressable';
import { useFocusEffect, useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import * as Updates from 'expo-updates';
import { checkForUpdateManually } from '@/lib/updates';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { api } from '@/lib/convex';
import { useFacets, useOverlaidPapers, useScopedPages } from '@/lib/queries';
import { useOnboarding, useScope, useTrends, isLowData, useSession, firstNameOf } from '@/lib/store';
import { phraseFor, nextBoundaryMs } from '@shared/phrases';
import { filterPapers, rankPapers } from '@shared/search';
import { formatCount, timeAgo, type Paper, type Subject } from '@shared/design';
import { getStreak, markReadingDay, type StreakInfo } from '@/lib/streaks';
import { upcomingExams, daysUntil, removeExam, type ExamEntry } from '@/lib/exams';
import { SearchBar } from '@/components/SearchBar';
import { ScopePill } from '@/components/ScopePill';
import { PaperCard } from '@/components/PaperCard';
import { OfflineBadge } from '@/components/states';
import { AmbientGrain } from '@/components/Grain';
import { useNet } from '@/lib/net';
import { downloadPaper, getPrefetchEnabled, isDownloaded, resolvePaperUrl } from '@/lib/downloads';
import { getCachedPaper } from '@/lib/cache';
import { getRecents, type RecentEntry } from '@/lib/recents';
import { enqueue } from '@/lib/outbox';
import { useDockScrollWiring } from '@/motion/dockScroll';
import { track } from '@/lib/analytics';
import { toast } from '@/components/Toast';
import { fonts, spacing } from '@/theme/tokens';
import { useThemeColors, useThemeScheme } from '@/components/ThemeProvider';
import { Icon } from '@/icons/icons';

const DockScrollView = Animated.ScrollView;
const backdrop = require('@/assets/art/backdrop.webp') as number;

// StatsRow — real counts only, from the already-loaded facets. Equal-width
// cells with 1px dividers; mono values, uppercase micro-labels. Renders
// nothing while facets is still loading (no fake numbers, ever).
function StatsRow({
  subjects,
  courses,
  c,
}: {
  subjects: number | undefined;
  courses: number | undefined;
  c: ReturnType<typeof useThemeColors>;
}) {
  if (subjects === undefined || courses === undefined) return null;
  const cells = [
    { value: formatCount(subjects), label: 'SUBJECTS' },
    { value: formatCount(courses), label: 'COURSES' },
  ];
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`${cells.map((x) => `${x.value} ${x.label.toLowerCase()}`).join(', ')}`}
      style={{
        flexDirection: 'row',
        alignItems: 'stretch',
        justifyContent: 'center',
        marginTop: 24,
        alignSelf: 'center',
      }}
    >
      {cells.map((cell, i) => (
        <View
          key={cell.label}
          style={{
            alignItems: 'center',
            paddingHorizontal: 22,
            borderLeftWidth: i > 0 ? 1 : 0,
            borderLeftColor: c.borderDefault,
          }}
        >
          <Text style={{ fontSize: 20, fontFamily: fonts.mono, color: c.textPrimary, fontVariant: ['tabular-nums'] }}>
            {cell.value}
          </Text>
          <Text
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              color: c.textTertiary,
              fontFamily: fonts.sans,
              marginTop: 2,
            }}
          >
            {cell.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function Home() {
  const c = useThemeColors();
  const night = useThemeScheme() === 'dark';
  const router = useRouter();
  const facets = useFacets();
  const { results } = useScopedPages();
  const bumpLocal = useTrends((s) => s.bumpLocal);
  const reopen = useOnboarding((s) => s.reopen);
  const profile = useSession((s) => s.profile);
  const recordTrend = useMutation(api.trends.record);
  const trendingServer = useQuery(api.trends.getTop, { limit: 5 });
  const [query, setQuery] = useState('');
  const [phrase, setPhrase] = useState(() => phraseFor(new Date()));
  const [refreshing, setRefreshing] = useState(false);
  const [streak, setStreak] = useState<StreakInfo>(() => getStreak());
  const [exams, setExams] = useState<ExamEntry[]>(() => upcomingExams(3));
  const { online, wifi } = useNet();
  const { program, levelYear } = useScope();
  const dockWire = useDockScrollWiring('home');

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const schedule = () => {
      t = setTimeout(
        () => {
          setPhrase(phraseFor(new Date()));
          schedule();
        },
        Math.max(1000, nextBoundaryMs(new Date()) - Date.now()),
      );
    };
    schedule();
    return () => clearTimeout(t);
  }, []);

  const subjects: Subject[] = useMemo(() => {
    if (!facets) return [];
    const byId = new Map(facets.subjects.map((s) => [s.id, { ...s, courses: [] as never[] }]));
    for (const course of facets.courses) {
      const s = byId.get(course.subjectId);
      if (s) (s.courses as unknown[]).push(course);
    }
    return [...byId.values()] as Subject[];
  }, [facets]);

  const recentBase = useMemo(
    () =>
      [...(results as Paper[])]
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, 10),
    [results],
  );
  const recent = useOverlaidPapers(recentBase);

  // Streak ticks whenever the user comes back from reading something.
  useFocusEffect(
    useCallback(() => {
      setStreak(markReadingDay());
      setExams(upcomingExams(3));
    }, []),
  );

  const commitSearch = (q: string) => {
    bumpLocal(q.toLowerCase());
    track('search_commit', { len: q.length });
    void recordTrend({ term: q }).catch(() =>
      enqueue({ kind: 'trend', term: q.toLowerCase(), count: 1 }),
    );
    router.navigate({ pathname: '/(tabs)/search', params: { q } });
  };

  const openPaper = (p: Paper) => router.push(`/paper/${p.id}`);

  // Live top matches for the Home dropdown (tappable straight to details).
  const homeTop = useMemo(() => {
    if (query.trim().length < 2) return [];
    return rankPapers(filterPapers(results as Paper[], query, {}), query).slice(0, 5);
  }, [results, query]);

  const openTopResult = (p: Paper) => {
    // The trend signal is what the user ACTUALLY acted on: the suggestion
    // text they tapped, not the half-typed query in the field.
    const term = p.title.trim();
    void recordTrend({ term }).catch(() =>
      enqueue({ kind: 'trend', term: term.toLowerCase(), count: 1 }),
    );
    router.push(`/paper/${p.id}`);
  };

  // Recently viewed (refresh on return — recents update while reading).
  const [recents, setRecents] = useState<RecentEntry[]>([]);
  useFocusEffect(
    useCallback(() => {
      setRecents(getRecents());
    }, []),
  );
  const continueList = useMemo(() => {
    const pool = results as Paper[];
    return recents
      .flatMap((r) => {
        const live = pool.find((p) => p.id === r.id) ?? getCachedPaper(r.id);
        return live ? [{ paper: live, at: r.at }] : [];
      })
      .slice(0, 6);
  }, [recents, results]);

  const surprise = () => {
    const pool = results as Paper[];
    if (!pool.length) {
      toast('Nothing loaded yet — pull to refresh');
      return;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) {
      toast('Shuffling the shelves…');
      router.push(`/paper/${pick.id}`);
    }
  };

  // Trending chips — local session trends first (instant, private), then
  // server-wide top terms to fill up to three. Hidden when there's nothing.
  const trending = useMemo(() => {
    const local = Object.entries(useTrends.getState().local)
      .sort((a, b) => b[1] - a[1])
      .map(([term]) => term);
    const top = (trendingServer ?? []).map((t) => t.term);
    const merged: string[] = [];
    for (const t of [...local, ...top]) {
      const key = t.toLowerCase();
      if (!merged.some((m) => m.toLowerCase() === key)) merged.push(t);
      if (merged.length >= 3) break;
    }
    return merged;
  }, [trendingServer]);

  // Wifi-only prefetch: top-5 recent-in-scope land on disk silently.
  // Runs once per scope+list; failures are silent by design.
  const prefetchKey = useRef('');
  useEffect(() => {
    if (!wifi || !getPrefetchEnabled() || isLowData() || recent.length === 0) return;
    const key = `${levelYear}/${program}:${recent
      .slice(0, 5)
      .map((p) => p.id)
      .join(',')}`;
    if (prefetchKey.current === key) return;
    prefetchKey.current = key;
    void (async () => {
      for (const p of recent.slice(0, 5)) {
        try {
          if (await isDownloaded(p.id)) continue;
          const url = await resolvePaperUrl(p);
          await downloadPaper({ id: p.id, ext: p.fileExt, url });
        } catch {
          // silent — prefetch never interrupts reading
        }
      }
    })();
  }, [wifi, recent, levelYear, program]);

  const searching = query.trim().length >= 2;

  return (
    <View style={{ flex: 1, backgroundColor: c.bgDefault }}>
    {/* Fixed full-bleed line-art backdrop — one non-interactive layer. */}
    <Animated.View
      entering={FadeIn.duration(420)}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <Image
        source={backdrop}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="bottom"
        tintColor={c.textPrimary}
        recyclingKey="home-backdrop"
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: c.bgDefault, opacity: night ? 0.5 : 0.6 },
        ]}
      />
    </Animated.View>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <DockScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        paddingBottom: 120,
      }}
      keyboardShouldPersistTaps="handled"
      onScroll={dockWire.onScroll}
      scrollEventThrottle={dockWire.scrollEventThrottle}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={c.textTertiary}
          title="Pull to reload"
          titleColor={c.textTertiary}
          onRefresh={async () => {
            setRefreshing(true);
            try {
              // Drag-to-reload: Convex live queries self-update; the manual
              // kick is the OTA check — fetch + apply if one landed, else
              // a quiet "latest" toast. Dev builds just settle the spinner.
              if (!__DEV__ && Updates.isEnabled) {
                const msg = await checkForUpdateManually();
                if (msg !== 'You are on the latest version') {
                  toast(msg);
                  return; // reloadAsync already restarted the bundle
                }
              }
              await new Promise((r) => setTimeout(r, 400));
              toast('Reloaded');
            } finally {
              setRefreshing(false);
            }
          }}
        />
      }
    >
      <View style={{ maxWidth: 900, alignSelf: 'center', width: '100%', paddingHorizontal: spacing.gutter, paddingTop: 84, position: 'relative' }}>
        <AmbientGrain />
        {profile ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 14, color: c.textSecondary, fontFamily: fonts.sans }}>
              Welcome,{' '}
              <Text style={{ fontWeight: '600', color: c.textPrimary, fontFamily: fonts.sansSemi }}>
                {firstNameOf(profile.name)}
              </Text>
            </Text>
            {streak.current > 0 ? (
              <View
                accessibilityRole="text"
                accessibilityLabel={`Reading streak: ${streak.current} days`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Icon name={streak.atRisk ? 'hourglass' : 'flame'} size={12} color={c.textSecondary} />
                <Text style={{ fontSize: 12, color: c.textSecondary, fontFamily: fonts.sans }}>
                  · {'\u00B7'} {streak.current}d
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 14, color: c.textSecondary, fontFamily: fonts.sans }}>
              Welcome — browsing as guest.
            </Text>
            <HapticPressable
              onPress={() => {
                reopen();
                router.push('/onboarding');
              }}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: c.textPrimary, fontFamily: fonts.sansSemi, textDecorationLine: 'underline' }}>
                Sign in
              </Text>
            </HapticPressable>
          </View>
        )}
        {!online ? (
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <OfflineBadge />
          </View>
        ) : null}
        <Animated.View key={phrase} entering={FadeIn.duration(260)}>
          <Text
            accessibilityRole="header"
            style={{
              fontSize: 28,
              lineHeight: 34,
              color: c.textPrimary,
              fontFamily: fonts.sansSemi,
              textAlign: 'center',
              letterSpacing: -0.5,
            }}
          >
            {phrase}
          </Text>
        </Animated.View>

        <View style={{ marginTop: 24 }}>
          <SearchBar
            value={query}
            onChange={setQuery}
            onCommit={commitSearch}
            onSeeAll={(q) => router.navigate({ pathname: '/(tabs)/search', params: { q } })}
            topResults={homeTop}
            onOpenPaper={openTopResult}
            papers={recent}
            subjectNames={subjects.map((s) => s.name)}
            courseNames={facets?.courses.map((x) => x.displayName || x.name) ?? []}
          />
        </View>

        {/* Trending chips — up to 3, one line, tap = commitSearch. */}
        {!searching && trending.length > 0 ? (
          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            {trending.map((t) => (
              <HapticPressable
                key={t}
                onPress={() => commitSearch(t)}
                accessibilityRole="button"
                accessibilityLabel={`Search for ${t}`}
                style={{
                  paddingVertical: 7,
                  paddingHorizontal: 13,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: c.borderDefault,
                  minHeight: 44,
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 12.5, color: c.textSecondary, fontFamily: fonts.sansMedium }}>
                  {t}
                </Text>
              </HapticPressable>
            ))}
          </View>
        ) : null}

        <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          <ScopePill onPress={reopen} />
          <HapticPressable
            onPress={surprise}
            accessibilityRole="button"
            accessibilityLabel="Open a random paper from your scope"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 999,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: c.borderStrong,
              minHeight: 44,
            }}
          >
            <Icon name="sparkle" size={14} color={c.textSecondary} />
            <Text style={{ fontSize: 13, fontWeight: '500', color: c.textPrimary, fontFamily: fonts.sansMedium }}>
              Surprise me
            </Text>
          </HapticPressable>
        </View>

        {/* Quick actions — Contribute + Saved (existing routes only). */}
        {!searching ? (
          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <HapticPressable
              onPress={() => router.push('/upload')}
              accessibilityRole="button"
              accessibilityLabel="Contribute a paper"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 999,
                backgroundColor: c.textPrimary,
                minHeight: 44,
                justifyContent: 'center',
              }}
            >
              <Icon name="upload" size={13} color={c.bgDefault} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: c.bgDefault, fontFamily: fonts.sansMedium }}>
                Contribute
              </Text>
            </HapticPressable>
            <HapticPressable
              onPress={() => router.navigate('/(tabs)/saved')}
              accessibilityRole="button"
              accessibilityLabel="Open saved papers"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: c.borderStrong,
                minHeight: 44,
                justifyContent: 'center',
              }}
            >
              <Icon name="bookmark" size={13} color={c.textSecondary} />
              <Text style={{ fontSize: 13, fontWeight: '500', color: c.textPrimary, fontFamily: fonts.sansMedium }}>
                Saved
              </Text>
            </HapticPressable>
          </View>
        ) : null}

        <StatsRow
          subjects={facets ? facets.subjects.length : undefined}
          courses={facets ? facets.courses.length : undefined}
          c={c}
        />
      </View>

      {/* While searching, everything below yields the screen to live results. */}
      {!searching ? (
        <Animated.View
          exiting={FadeOut.duration(200)}
          style={{ maxWidth: 900, alignSelf: 'center', width: '100%', paddingHorizontal: spacing.gutter, marginTop: 32 }}
        >
          {exams.length > 0 ? (
            <View style={{ gap: 8 }}>
              {exams.map((e) => {
                const d = daysUntil(e.at);
                const urgent = d <= 7;
                return (
                  <View
                    key={e.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderWidth: 1,
                      borderColor: urgent ? c.textPrimary : c.borderDefault,
                      borderRadius: 10,
                      backgroundColor: c.bgElevated,
                    }}
                  >
                    <View style={{ width: 44, alignItems: 'center' }}>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: urgent ? c.textPrimary : c.textSecondary, fontFamily: fonts.sansSemi }}>
                        {d}
                      </Text>
                      <Text style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.2, color: c.textTertiary, fontFamily: fonts.sans }}>days</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: c.textPrimary, fontFamily: fonts.sansMedium }}>
                        {e.course}
                      </Text>
                      <Text style={{ fontSize: 11, color: c.textTertiary, fontFamily: fonts.mono, marginTop: 2 }}>
                        {new Date(e.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        {d === 0 ? ' · TODAY' : d === 1 ? ' · TOMORROW' : ''}
                      </Text>
                    </View>
                    <HapticPressable
                      onPress={() => router.push('/(tabs)/search?focus=1')}
                      accessibilityRole="button"
                      accessibilityLabel={`Find ${e.course} past questions`}
                      style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: c.borderStrong, minHeight: 40, justifyContent: 'center' }}
                    >
                      <Text style={{ fontSize: 12, color: c.textPrimary, fontFamily: fonts.sansMedium }}>Past Qs</Text>
                    </HapticPressable>
                    <HapticPressable
                      onPress={() => {
                        removeExam(e.id);
                        setExams(upcomingExams(3));
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${e.course} exam`}
                      style={{ minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Icon name="x" size={14} color={c.textQuiet} />
                    </HapticPressable>
                  </View>
                );
              })}
            </View>
          ) : null}

          {continueList.length > 0 ? (
            <View style={{ marginTop: exams.length > 0 ? 28 : 0 }}>
              <Text style={{ fontSize: 22, fontWeight: '600', color: c.textPrimary, fontFamily: fonts.sansSemi, marginBottom: 16 }}>
                Pick up where you left off
              </Text>
              <FlashList
                horizontal
                data={continueList}
                keyExtractor={(p) => `continue-${p.paper.id}`}
                showsHorizontalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ width: 20 }} />}
                renderItem={({ item, index }) => (
                  <View style={{ width: 120 }}>
                    <PaperCard paper={item.paper} size="sm" index={index} onPress={() => openPaper(item.paper)} />
                    <Text style={{ fontSize: 11, color: c.textTertiary, fontFamily: fonts.mono, marginTop: 6 }}>
                      {timeAgo(item.at)}
                    </Text>
                  </View>
                )}
              />
            </View>
          ) : null}
        </Animated.View>
      ) : null}
    </DockScrollView>
    </KeyboardAvoidingView>
    </View>
  );
}
