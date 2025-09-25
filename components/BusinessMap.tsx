import React from "react";

const BusinessMap = React.memo(({ businesses: _businesses }: any) => (
  <div className="my-8">
    <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-500">
      [Mapa de negocios aquí]
    </div>
  </div>
));

export default BusinessMap;
