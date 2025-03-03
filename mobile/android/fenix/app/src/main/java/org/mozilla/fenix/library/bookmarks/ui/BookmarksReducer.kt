/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.library.bookmarks.ui

/**
 * Function for reducing a new bookmarks state based on the received action.
 */
internal fun bookmarksReducer(state: BookmarksState, action: BookmarksAction) = when (action) {
    is BookmarksLoaded -> state.copy(
        folderTitle = action.folderTitle,
        bookmarkItems = action.bookmarkItems,
    )
    is BookmarkLongClicked -> state.toggleSelectionOf(action.item)
    is FolderLongClicked -> state.toggleSelectionOf(action.item)
    is FolderClicked -> if (state.selectedItems.isNotEmpty()) {
        state.toggleSelectionOf(action.item)
    } else {
        state
    }
    is BookmarkClicked -> if (state.selectedItems.isNotEmpty()) {
        state.toggleSelectionOf(action.item)
    } else {
        state
    }
    SearchClicked,
    Init,
    -> state
}

private fun BookmarksState.toggleSelectionOf(item: BookmarkItem): BookmarksState =
    if (selectedItems.any { it.guid == item.guid }) {
        copy(selectedItems = selectedItems - item)
    } else {
        copy(selectedItems = selectedItems + item)
    }
