# Third-party notices

The rights-reserved notice for original Gym Paradise code does not replace third-party licences.

## Shared UI primitives

`components/ui/button.tsx`, `dialog.tsx` and `tabs.tsx` derive from the shadcn/ui starter. Earlier commits also include unused starter components that have since been removed. Their upstream licence is retained below.

Source: https://github.com/shadcn-ui/ui · [upstream licence](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md).

```text
MIT License

Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Reflection environment

`public/environments/studio.env` is from [BabylonJS Assets](https://github.com/BabylonJS/Assets/blob/master/environments/studio.env), used unchanged under CC BY 4.0. The licence is included in `public/environments/LICENSE.txt`.

## Other dependencies and assets

Installed npm packages retain the notices and licences distributed in their packages. `package-lock.json` records the exact dependency versions used. Optional recognition runtimes and model weights are downloaded on demand and retain their upstream terms; those weights are not bundled in this source repository.

The equipment meshes are original procedural geometry. The mural is generated project artwork. No user-provided gym photographs or Sketchfab machine meshes are redistributed. See [asset provenance](docs/assets.md) for details and sources.
