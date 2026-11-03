import React from "react";
import { Composition } from "remotion";
import { RadarPromo, sceneFrames } from "./RadarPromo";
import { BaBuoc, khungBaBuoc } from "./BaBuoc";
import { TinPhong } from "./tin/TinPhong";
import { khungTin, TIN_MAU, TinProps } from "./tin/types";
import { napVo } from "./components/Vo";

const FPS = 30;

export const Root: React.FC = () => (
  <>
    <Composition id="RadarPromo" component={RadarPromo} durationInFrames={sceneFrames(FPS).total}
      calculateMetadata={async () => {
        const vo = await napVo("promo");
        return { durationInFrames: sceneFrames(FPS, vo).total, props: { vo } };
      }}
      fps={FPS} width={1080} height={1920} />
    <Composition id="BaBuoc" component={BaBuoc} durationInFrames={khungBaBuoc(FPS).total}
      calculateMetadata={async () => {
        const vo = await napVo("ba-buoc");
        return { durationInFrames: khungBaBuoc(FPS, vo).total, props: { vo } };
      }}
      fps={FPS} width={1080} height={1920} />
    <Composition id="TinPhong" component={TinPhong} defaultProps={TIN_MAU as TinProps}
      calculateMetadata={({ props }) => ({ durationInFrames: khungTin(props, FPS).tong })}
      durationInFrames={khungTin(TIN_MAU, FPS).tong} fps={FPS} width={1080} height={1920} />
  </>
);
