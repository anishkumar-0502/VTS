const PageShimmer = () => {
  return (
    <div className="animate-pulse p-6 max-w-6xl mx-auto space-y-6">

      {/* Breadcrumb Shimmer */}
      <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>

      {/* Card Container */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">

        {/* Header Shimmer */}
        <div className="flex items-center justify-between">
          <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-9 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>

        {/* Table Header Shimmer */}
        <div className="grid grid-cols-5 gap-4 mt-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>

        {/* Table Rows Shimmer */}
        <div className="space-y-3 mt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((__, j) => (
                <div
                  key={j}
                  className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"
                ></div>
              ))}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default PageShimmer;
