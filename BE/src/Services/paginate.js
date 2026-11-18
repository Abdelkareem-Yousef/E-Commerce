// ?page=2&limit=20 -> { page, limit, skip }
// limit is capped so nobody can ask for 100000 products in one request
export const MAX_LIMIT = 50

export const pageParams = (query = {}, defaultLimit = 20) => {
    const page = Math.max(1, parseInt(query.page) || 1)
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit) || defaultLimit))
    return { page, limit, skip: (page - 1) * limit }
}

// sent back next to the list so the frontend can draw the page numbers
export const pageInfo = (page, limit, total) => ({
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit))
})
