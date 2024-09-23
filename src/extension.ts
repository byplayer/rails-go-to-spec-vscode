import * as vscode from "vscode";
import * as resolver from "./resolver";
import * as fs from "fs";
import * as path from "path";
import * as mkdirp from "mkdirp";

function openFile(fileName: string) {
    vscode.workspace
        .openTextDocument(fileName)
        .then(vscode.window.showTextDocument);
}

function prompt(fileName: string, cb: any) {
    let options = {
        placeHolder: `Create ${fileName}?`
    };

    vscode.window.showQuickPick(["Yes", "No"], options)
        .then(function (answer) {
            if (answer === "Yes") {
                cb();
            }
        });
}

function openPrompt(related: string): void {
    const dirname: string = path.dirname(related);
    const relative = vscode.workspace.asRelativePath(related);
    prompt(relative, function () {
        mkdirp.sync(dirname);
        fs.closeSync(fs.openSync(related, "w"));
        openFile(related);
    });
}

function getCurrentMethodName(editor: vscode.TextEditor | undefined): string | null {
    const position = editor?.selection.active;

    if (!position) {
        return null;
    }

    const document = editor.document;
    const text = document.getText();
    const offset = document.offsetAt(position);

    const methodRegex = /def\s+([\w_]+[!?]?)/g;
    let match;
    let currentMethod = null;

    while ((match = methodRegex.exec(text)) !== null) {
        if (match.index <= offset) {
            currentMethod = match[1];
        } else {
            break;
        }
    }

    return currentMethod;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log("Congratulations, your extension 'rails-go-to-spec-v3' is now active!");

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand("rails-go-to-spec-v3.railsGoToSpec", () => {
        // Display a message box to the user
        var editor = vscode.window.activeTextEditor;
        if (!editor) {
            return; // No open text editor
        }

        let document: vscode.TextDocument = editor.document;
        let fileName: string = document.fileName;
        // Get a list of related files
        // if any of those exists, open it
        // Otherwise prompt to create the first one
        let related: Array<string> = resolver.getRelated(fileName);

        if (fileName.includes("/public/")) {
            // We fake the name file and try again
            let methodName = getCurrentMethodName(editor);
            let fakeNameFile = fileName.replace(".rb", `/${methodName}.rb`);
            related = resolver.getRelated(fakeNameFile);
        }

        let fileFound = false;
        for (let relatedFile of related) {
            let fileExists: boolean = fs.existsSync(relatedFile);
            if (fileExists) {
                openFile(relatedFile);
                fileFound = true;
                break;
            }
        }

        if (!fileFound) {
            let first = related[0];
            if (first != null) {
                openPrompt(first);
            }
        }
    });

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
