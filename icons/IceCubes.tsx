"use client";

import React from "react";
import Image from "next/image";
import { IconProps } from "../utils/types";
import { pearlWhite } from "@/images";

/** White pearl icon (same asset as IceCube) for top bar / balance chrome. */
const IceCubes: React.FC<IconProps> = ({ size = 24, className = "" }) => {
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

export default IceCubes;
