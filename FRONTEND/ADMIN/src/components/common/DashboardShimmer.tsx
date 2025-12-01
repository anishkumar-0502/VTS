const DashboardShimmer = () => {
  return (
    <div className="animate-pulse p-4 md:p-6 space-y-6">

      {/* Metrics Row */}
      <div className="grid grid-cols-12 gap-4">
        {[1, 2, 3, 4].map((_, i) => (
          <div
            key={i}
            className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white dark:bg-gray-900
                       p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700"
          >
            <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>

      {/* World Map + Monthly Target */}
      <div className="grid grid-cols-12 gap-4">
        <div
          className="col-span-12 xl:col-span-8 bg-white dark:bg-gray-900
                     h-80 rounded-lg border border-gray-200 dark:border-gray-700"
        ></div>

        <div
          className="col-span-12 xl:col-span-4 bg-white dark:bg-gray-900
                     h-80 rounded-lg border border-gray-200 dark:border-gray-700"
        ></div>
      </div>

      {/* Monthly Sales Chart */}
      <div
        className="bg-white dark:bg-gray-900 h-72 rounded-lg border
                   border-gray-200 dark:border-gray-700"
      ></div>

      {/* Operator Stats Chart */}
      <div
        className="bg-white dark:bg-gray-900 h-72 rounded-lg border
                   border-gray-200 dark:border-gray-700"
      ></div>

      {/* Recent Orders */}
      <div
        className="bg-white dark:bg-gray-900 h-96 rounded-lg border
                   border-gray-200 dark:border-gray-700"
      ></div>

    </div>
  );
};

export default DashboardShimmer;
