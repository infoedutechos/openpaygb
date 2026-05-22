"use client";

import React from "react";
import Image from "next/image";
import { IconProps } from "../utils/types";
import { pearlWhite } from "@/images";

/** White pearl icon used for PEARLS / in-game currency across the app. */
const IceCube: React.FC<IconProps> = ({ size = 24, className = "" }) => {
  return (
    <Image
      src={pearlWhite}
      alt="White pearls"
      width={size}
      height={size}
      className={className}
      unoptimized
    />
  );
};

export default IceCube;
