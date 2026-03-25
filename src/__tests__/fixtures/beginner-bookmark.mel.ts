/**
 * Beginner-level MEL fixture: Bookmark Manager
 *
 * A simple bookmark counter domain used in beginner E2E tests.
 */

export const BEGINNER_BOOKMARK_MEL = `\
domain BookmarkManager {
  state {
    totalBookmarks: number = 0
    lastTitle: string = ""
    isFavorite: boolean = false
  }

  computed hasBookmarks = gt(totalBookmarks, 0)
  computed displayCount = concat("Total: ", toString(totalBookmarks))

  action addBookmark(title: string) {
    onceIntent {
      when neq(trim(title), "") {
        patch totalBookmarks = add(totalBookmarks, 1)
        patch lastTitle = trim(title)
      }
    }
  }

  action toggleFavorite() {
    onceIntent {
      patch isFavorite = not(isFavorite)
    }
  }

  action reset() {
    when hasBookmarks {
      patch totalBookmarks = 0
      patch lastTitle = ""
      patch isFavorite = false
    }
  }
}
`;

/**
 * Broken variant — uses an unknown function to trigger E_UNKNOWN_FN diagnostic.
 */
export const BEGINNER_BROKEN_MEL = `\
domain BookmarkManager {
  state {
    totalBookmarks: number = 0
    lastTitle: string = ""
    isFavorite: boolean = false
  }

  computed hasBookmarks = gt(totalBookmarks, 0)
  computed displayCount = concat("Total: ", toString(totalBookmarks))
  computed broken = unknownFunc(totalBookmarks)

  action addBookmark(title: string) {
    onceIntent {
      when neq(trim(title), "") {
        patch totalBookmarks = add(totalBookmarks, 1)
        patch lastTitle = trim(title)
      }
    }
  }

  action toggleFavorite() {
    onceIntent {
      patch isFavorite = not(isFavorite)
    }
  }

  action reset() {
    when hasBookmarks {
      patch totalBookmarks = 0
      patch lastTitle = ""
      patch isFavorite = false
    }
  }
}
`;
