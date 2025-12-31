
// utils/teleprompter.ts

export type TeleprompterWord = {
    original: string
    normalized: string
    index: number
}

export type MatchResult = {
    index: number
    matches: number
}

// Normalize word for comparison
export function normalizeWord(word: string): string {
    return word
        .toLowerCase()
        .normalize('NFD') // Decompose combined characters (accents)
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9ñ]/g, '') // Keep only alphanumeric and ñ
        .trim()
}

// Calculate similarity between two words (0.0 to 1.0)
export function wordSimilarity(word1: string, word2: string): number {
    if (word1 === word2) return 1.0
    if (word1.length < 2 || word2.length < 2) return 0

    const longer = word1.length > word2.length ? word1 : word2
    const shorter = word1.length > word2.length ? word2 : word1

    // If shorter is contained in longer (and is significant length)
    if (longer.includes(shorter) && shorter.length >= 3) {
        return shorter.length / longer.length
    }

    let matches = 0
    const minLen = Math.min(word1.length, word2.length)
    for (let i = 0; i < minLen; i++) {
        if (word1[i] === word2[i]) matches++
    }

    return matches / Math.max(word1.length, word2.length)
}

// Find best match in the script for the spoken words
// Uses Longest Increasing Subsequence (LIS) to filter out noise
export function findBestMatch(
    spokenWords: string[],
    scriptWords: TeleprompterWord[],
    startIndex: number
): MatchResult | null {
    const LOOK_AHEAD = 20; // Increased window slightly
    const MIN_WORD_LENGTH = 3;
    const MIN_SIMILARITY = 0.70; // Slightly more lenient as we have sequence check

    // Filter spoken words
    const validSpoken = spokenWords
        .map(normalizeWord)
        .filter(w => w.length >= MIN_WORD_LENGTH)

    if (validSpoken.length === 0) return null

    // Use more recent history for better sequence detection
    const recentSpoken = validSpoken.slice(-5)

    const searchEnd = Math.min(startIndex + LOOK_AHEAD, scriptWords.length)
    const expectedWindow = scriptWords.slice(startIndex, searchEnd)

    if (expectedWindow.length === 0) return null

    // 1. Collect all candidate matches
    // matches = [{ spokenIdx, scriptIdx }]
    const matches: { scriptIdx: number }[] = []

    for (const spoken of recentSpoken) {
        // Find FIRST match in window for this spoken word
        for (const expected of expectedWindow) {
            if (expected.normalized.length < MIN_WORD_LENGTH) continue

            const similarity = wordSimilarity(spoken, expected.normalized)
            if (similarity >= MIN_SIMILARITY) {
                matches.push({ scriptIdx: expected.index })
                break // Greedy match for this word, priority to proximity
            }
        }
    }

    if (matches.length === 0) return null

    // 2. Find Longest Increasing Subsequence (LIS) of script indices
    // This removes outliers (e.g. 10, 4, 6 -> 4, 6 is LIS)
    // Simple O(N^2) LIS is fine for N=5
    let bestSeq: number[] = []

    // Try starting LIS from each item
    for (let i = 0; i < matches.length; i++) {
        const seq = [matches[i].scriptIdx]
        let lastIdx = matches[i].scriptIdx

        for (let j = i + 1; j < matches.length; j++) {
            if (matches[j].scriptIdx > lastIdx) {
                seq.push(matches[j].scriptIdx)
                lastIdx = matches[j].scriptIdx
            }
        }

        if (seq.length > bestSeq.length) {
            bestSeq = seq
        } else if (seq.length === bestSeq.length) {
            // Tie-breaker: prefer the one ending later (progress) 
            // or closer to start? 
            // If we have [10] and [4]. Both len 1.
            // 4 is closer to current pos. Prefer 4.
            if (seq.length === 1) {
                if (seq[0] < bestSeq[0]) bestSeq = seq
            }
        }
    }

    // 3. Evaluate Result
    if (bestSeq.length > 0) {
        // Confidence check: 
        // If only 1 match, ensure it's not too far ahead or is a long word?
        // For now, trust the sequence logic + greedy break.
        const lastIndex = bestSeq[bestSeq.length - 1]

        // If we only matched 1 word and it bumped us > 10 words, maybe ignore?
        // Unless it's a very long unique word?
        // Let's stick to LIS result for now.
        if (lastIndex >= startIndex) {
            return { index: lastIndex, matches: bestSeq.length }
        }
    }

    return null
}

export function prepareScript(text: string): TeleprompterWord[] {
    const rawWords = text.split(/\s+/).filter(w => w.trim().length > 0)
    return rawWords.map((word, index) => ({
        original: word,
        normalized: normalizeWord(word),
        index: index
    }))
}
