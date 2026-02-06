import path from "node:path";
import { NodePath, type PluginObj } from '@babel/core'
import * as Babel from '@babel/core'
export default function SourcePath(babel: typeof Babel): PluginObj {

    const { types: t } = babel;
    return {
        name: 'babel-plugin-add-source', // 插件名称（可选）
        visitor: {
            // 在这里监听 JSX 元素
            JSXOpeningElement(nodePath: NodePath<Babel.types.JSXOpeningElement>, state) {
                const filePath = state.file.opts.filename;
                if (!filePath || filePath.includes('node_modules')) {
                    return;
                };
                const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');

                const sourceAttribute = t.jsxAttribute(
                    t.jsxIdentifier('data-source-path'),
                    t.stringLiteral(relativePath)
                );
                nodePath.node.attributes.push(sourceAttribute);

            }
        }
    };
}
